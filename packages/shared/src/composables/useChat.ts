import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import {
  prepareRegenerateAssistantMessage,
  prepareResendFromUserMessage,
  prepareSaveUserMessage,
  prepareSendMessage,
  streamAssistantReply as streamAssistantReplyCore,
  type ChatRuntimeEvent,
} from '@tuple-gpt/chat-core'
import { useProviderStore } from '../stores/providerStore'
import { useConversationStore } from '../stores/conversationStore'
import { usePlatform } from './usePlatform'
import { useFileAttachments } from './useFileAttachments'
import type { ChatMessage, MessageAttachment } from '@tuple-gpt/chat-core'

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

  function applyRuntimeEvent(event: ChatRuntimeEvent) {
    switch (event.type) {
      case 'assistant_started':
        conversationStore.addMessage(event.conversationId, event.message)
        break
      case 'assistant_delta':
        conversationStore.updateMessageContent(event.conversationId, event.messageId, event.content)
        break
      case 'assistant_done':
        conversationStore.updateMessageStatus(event.conversationId, event.messageId, 'done')
        break
      case 'assistant_error':
        conversationStore.updateMessageStatus(
          event.conversationId,
          event.messageId,
          'error',
          event.error,
        )
        break
    }
  }

  async function runAssistantReply(conversationId: string, history: ChatMessage[]): Promise<void> {
    const { provider, model } = getActiveRequestConfig()

    isStreaming.value = true
    abortController.value = new AbortController()
    let assistantMessageId: string | null = null

    try {
      for await (const event of streamAssistantReplyCore({
        conversationId,
        history,
        provider,
        model,
        maxTokens: 4096,
        signal: abortController.value.signal,
        createId: uuidv4,
      })) {
        if (event.type === 'assistant_started') {
          assistantMessageId = event.message.id
        }
        applyRuntimeEvent(event)
      }
    } catch (error: unknown) {
      if (assistantMessageId) {
        const isAbortError = error instanceof Error && error.name === 'AbortError'
        conversationStore.updateMessageStatus(
          conversationId,
          assistantMessageId,
          isAbortError ? 'done' : 'error',
          isAbortError ? undefined : error instanceof Error ? error.message : String(error),
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

    const currentFileAttachments = [...fileAttachments.value]
    let platformAttachments: MessageAttachment[] = []
    if (platform.prepareContext) {
      const result = await platform.prepareContext()
      if (result) {
        platformAttachments = result.attachments
      }
    }

    const allAttachments = [...platformAttachments, ...currentFileAttachments]

    const prepared = prepareSendMessage({
      activeConversation: conversationStore.getActiveConversation(),
      providerId: provider.id,
      model,
      content,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
      createId: uuidv4,
    })

    conversationStore.replaceConversation(prepared.conversation)

    // 发送成功后清理状态
    platform.clearAfterSend?.()
    clearFiles()

    await runAssistantReply(prepared.conversation.id, prepared.requestHistory)
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

    const conversation = prepareSaveUserMessage(target.conversation, messageId, content)
    if (conversation) {
      conversationStore.replaceConversation(conversation)
    }
  }

  async function resendFromUserMessage(messageId: string, content: string): Promise<void> {
    if (isStreaming.value) return

    const target = getActiveConversationMessage(messageId)
    if (!target || target.message.role !== 'user') return

    const prepared = prepareResendFromUserMessage(target.conversation, messageId, content)
    if (!prepared) return

    conversationStore.replaceConversation(prepared.conversation)
    await runAssistantReply(prepared.conversation.id, prepared.requestHistory)
  }

  async function regenerateAssistantMessage(messageId: string): Promise<void> {
    if (isStreaming.value) return

    const target = getActiveConversationMessage(messageId)
    if (!target || target.message.role !== 'assistant') return

    const prepared = prepareRegenerateAssistantMessage(target.conversation, messageId)
    if (!prepared) return

    conversationStore.replaceConversation(prepared.conversation)
    await runAssistantReply(prepared.conversation.id, prepared.requestHistory)
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
