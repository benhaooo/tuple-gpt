import { ref, computed } from 'vue'
import { ChatClient } from '@tuple-gpt/ai-core'
import { useProviderStore } from '../stores/providerStore'
import { useConversationStore } from '../stores/conversationStore'
import { toProviderConfig, toMessages } from '../adapters/ai-core-adapter'
import { usePlatform } from './usePlatform'
import { useFileAttachments } from './useFileAttachments'
import type { ChatMessage, MessageAttachment } from '../types/chat'

function formatAttachmentsAsContext(attachments: MessageAttachment[]): string {
  const valid = attachments.filter(a => a.extractedContent)
  if (valid.length === 0) return ''

  const pages = valid
    .map(a => `<page title="${a.title}" url="${a.url ?? ''}">\n${a.extractedContent}\n</page>`)
    .join('\n\n')

  return `\n\n<attached_pages>\n${pages}\n</attached_pages>`
}

export function useChat() {
  const providerStore = useProviderStore()
  const conversationStore = useConversationStore()
  const platform = usePlatform()
  const { attachments: fileAttachments, clear: clearFiles } = useFileAttachments()

  const isStreaming = ref(false)
  const abortController = ref<AbortController | null>(null)

  const activeConversation = computed(() => conversationStore.getActiveConversation())
  const messages = computed(() => activeConversation.value?.messages ?? [])

  function getActiveRequestConfig() {
    const selection = providerStore.activeModel
    const provider = providerStore.activeProvider
    if (!selection || !provider) {
      throw new Error('请先配置AI服务商')
    }

    return { provider, model: selection.model }
  }

  function buildRequestMessages(history: ChatMessage[]) {
    return history.map(message => {
      const contextStr = formatAttachmentsAsContext(message.attachments ?? [])

      return {
        role: message.role,
        content: contextStr ? message.content + contextStr : message.content,
        attachments: message.attachments,
      }
    })
  }

  async function streamAssistantReply(
    conversationId: string,
    history: ChatMessage[],
  ): Promise<void> {
    const { provider, model } = getActiveRequestConfig()

    const assistantMsg = conversationStore.addMessage(conversationId, {
      role: 'assistant',
      content: '',
      status: 'streaming',
      providerId: provider.id,
    })

    const aiMessages = toMessages(buildRequestMessages(history))

    isStreaming.value = true
    abortController.value = new AbortController()
    let accumulated = ''

    try {
      const events = ChatClient.chat(aiMessages, {
        provider: toProviderConfig(provider, model),
        defaults: { maxTokens: 4096, signal: abortController.value.signal },
      })

      for await (const event of events) {
        if (event.type === 'text_delta') {
          accumulated += event.text
          conversationStore.updateMessageContent(conversationId, assistantMsg.id, accumulated)
        } else if (event.type === 'error') {
          throw event.error
        }
      }

      conversationStore.updateMessageStatus(conversationId, assistantMsg.id, 'done')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        conversationStore.updateMessageStatus(conversationId, assistantMsg.id, 'done')
      } else {
        conversationStore.updateMessageStatus(
          conversationId,
          assistantMsg.id,
          'error',
          error.message,
        )
      }
    } finally {
      isStreaming.value = false
      abortController.value = null
    }
  }

  async function sendMessage(content: string): Promise<void> {
    if (isStreaming.value) return

    const { provider, model } = getActiveRequestConfig()

    let convId = conversationStore.activeConversationId
    if (!convId) {
      const conv = conversationStore.createConversation(provider.id, model)
      convId = conv.id
    }

    // 先快照历史消息，避免后续 addMessage 后再读 computed 的时序问题
    const historySnapshot = [...(conversationStore.getActiveConversation()?.messages ?? [])]

    const currentFileAttachments = [...fileAttachments.value]
    let platformAttachments: MessageAttachment[] = []
    if (platform.prepareContext) {
      const result = await platform.prepareContext()
      if (result) {
        platformAttachments = result.attachments
      }
    }

    const allAttachments = [...platformAttachments, ...currentFileAttachments]

    const userMessage = conversationStore.addMessage(convId, {
      role: 'user',
      content,
      status: 'done',
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    })

    // 发送成功后清理状态
    platform.clearAfterSend?.()
    clearFiles()

    await streamAssistantReply(convId, [...historySnapshot, userMessage])
  }

  function stopStreaming() {
    abortController.value?.abort()
  }

  function newConversation() {
    const selection = providerStore.activeModel
    const provider = providerStore.activeProvider
    if (selection && provider) {
      conversationStore.createConversation(provider.id, selection.model)
    }
  }

  function normalizeContent(content: string) {
    return content.trim()
  }

  function canPersistEditedMessage(message: ChatMessage, content: string) {
    return normalizeContent(content).length > 0 || (message.attachments?.length ?? 0) > 0
  }

  function getActiveConversationMessage(messageId: string) {
    const conversation = activeConversation.value
    if (!conversation) return null

    const index = conversation.messages.findIndex(message => message.id === messageId)
    if (index === -1) return null

    return {
      conversation,
      index,
      message: conversation.messages[index],
    }
  }

  async function saveUserMessage(messageId: string, content: string): Promise<void> {
    const target = getActiveConversationMessage(messageId)
    if (!target || target.message.role !== 'user') return

    if (!canPersistEditedMessage(target.message, content)) return

    conversationStore.updateMessageContent(
      target.conversation.id,
      messageId,
      normalizeContent(content),
    )
  }

  async function resendFromUserMessage(messageId: string, content: string): Promise<void> {
    if (isStreaming.value) return

    const target = getActiveConversationMessage(messageId)
    if (!target || target.message.role !== 'user') return

    if (!canPersistEditedMessage(target.message, content)) return

    const conversationId = target.conversation.id
    conversationStore.updateMessageContent(conversationId, messageId, normalizeContent(content))
    conversationStore.truncateAfterMessage(conversationId, messageId)

    const requestHistory = [...target.conversation.messages]
    await streamAssistantReply(conversationId, requestHistory)
  }

  async function regenerateAssistantMessage(messageId: string): Promise<void> {
    if (isStreaming.value) return

    const target = getActiveConversationMessage(messageId)
    if (!target || target.message.role !== 'assistant') return

    const anchorUser = [...target.conversation.messages.slice(0, target.index)]
      .reverse()
      .find(message => message.role === 'user')

    if (!anchorUser) return

    const conversationId = target.conversation.id
    conversationStore.truncateAfterMessage(conversationId, anchorUser.id)

    const requestHistory = [...target.conversation.messages]
    await streamAssistantReply(conversationId, requestHistory)
  }

  async function retryLastMessage(): Promise<void> {
    const conv = activeConversation.value
    if (!conv) return

    const lastAssistant = [...conv.messages].reverse().find(message => message.role === 'assistant')
    if (lastAssistant) {
      await regenerateAssistantMessage(lastAssistant.id)
      return
    }

    const lastUser = [...conv.messages].reverse().find(message => message.role === 'user')
    if (lastUser) {
      await resendFromUserMessage(lastUser.id, lastUser.content)
    }
  }

  return {
    isStreaming,
    activeConversation,
    messages,
    sendMessage,
    stopStreaming,
    newConversation,
    retryLastMessage,
    saveUserMessage,
    resendFromUserMessage,
    regenerateAssistantMessage,
  }
}
