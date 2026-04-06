import { ref, computed } from 'vue'
import { marked } from 'marked'
import { ChatClient } from '@tuple-gpt/ai-core'
import { useProviderStore } from '../stores/providerStore'
import { useConversationStore } from '../stores/conversationStore'
import { toProviderConfig, toMessages } from '../adapters/ai-core-adapter'
import { usePlatform } from './usePlatform'
import { useFileAttachments } from './useFileAttachments'
import type { MessageAttachment } from '../types/chat'

function formatAttachmentsAsContext(attachments: MessageAttachment[]): string {
  const valid = attachments.filter(a => a.extractedContent)
  if (valid.length === 0) return ''

  const pages = valid.map(a =>
    `<page title="${a.title}" url="${a.url ?? ''}">\n${a.extractedContent}\n</page>`,
  ).join('\n\n')

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

  function parseMarkdown(content: string): string {
    if (!content) return ''
    return marked.parse(content, { async: false }) as string
  }

  async function sendMessage(content: string, extraAttachments?: MessageAttachment[]): Promise<void> {
    const selection = providerStore.activeModel
    const provider = providerStore.activeProvider
    if (!selection || !provider) {
      throw new Error('请先配置AI服务商')
    }

    let convId = conversationStore.activeConversationId
    if (!convId) {
      const conv = conversationStore.createConversation(provider.id, selection.model)
      convId = conv.id
    }

    // 先快照历史消息，避免后续 addMessage 后再读 computed 的时序问题
    const historySnapshot = [...(conversationStore.getActiveConversation()?.messages ?? [])]

    // 收集文件附件（来自 useFileAttachments 或 retry 传入的 extraAttachments）
    const currentFileAttachments = extraAttachments ?? [...fileAttachments.value]

    // 通过平台钩子收集附件上下文（如提取 tab 内容）
    let platformAttachments: MessageAttachment[] = []
    let contextStr = ''
    if (platform.prepareContext) {
      const result = await platform.prepareContext()
      if (result) {
        platformAttachments = result.attachments
        contextStr = result.context
      }
    }

    // 合并所有附件
    const allAttachments = [...platformAttachments, ...currentFileAttachments]

    // 文本文件的上下文也注入 contextStr
    const textFileContext = formatAttachmentsAsContext(
      currentFileAttachments.filter(a => a.category === 'text'),
    )
    contextStr += textFileContext

    // Add user message
    conversationStore.addMessage(convId, {
      role: 'user',
      content,
      status: 'done',
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    })

    // Add placeholder assistant message
    const assistantMsg = conversationStore.addMessage(convId, {
      role: 'assistant',
      content: '',
      status: 'streaming',
      providerId: provider.id,
    })

    // 发送成功后清理状态
    platform.clearAfterSend?.()
    if (!extraAttachments) clearFiles()

    isStreaming.value = true
    abortController.value = new AbortController()
    let accumulated = ''

    try {
      // 用快照拼接历史，再加上当前携带上下文的用户消息
      const apiMessages = [
        ...historySnapshot.map(msg => {
          const msgContextStr = formatAttachmentsAsContext(msg.attachments ?? [])
          return msgContextStr ? { ...msg, content: msg.content + msgContextStr } : msg
        }),
        {
          role: 'user' as const,
          content: contextStr ? content + contextStr : content,
          attachments: currentFileAttachments.filter(a => a.category !== 'text'),
        },
      ]
      const aiMessages = toMessages(apiMessages)
      const events = ChatClient.chat(aiMessages, {
        provider: toProviderConfig(provider, selection.model),
        defaults: { maxTokens: 4096, signal: abortController.value.signal },
      })

      for await (const event of events) {
        if (event.type === 'text_delta') {
          accumulated += event.text
          conversationStore.updateMessageContent(convId!, assistantMsg.id, accumulated)
        } else if (event.type === 'error') {
          throw event.error
        }
      }

      conversationStore.updateMessageStatus(convId!, assistantMsg.id, 'done')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        conversationStore.updateMessageStatus(convId!, assistantMsg.id, 'done')
      } else {
        conversationStore.updateMessageStatus(convId!, assistantMsg.id, 'error', error.message)
      }
    } finally {
      isStreaming.value = false
      abortController.value = null
    }
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

  async function retryLastMessage(): Promise<void> {
    const conv = activeConversation.value
    if (!conv || conv.messages.length < 2) return

    const lastMsg = conv.messages[conv.messages.length - 1]
    if (lastMsg.role === 'assistant' && lastMsg.status === 'error') {
      conv.messages.pop()
    }

    const lastUserMsg = conv.messages[conv.messages.length - 1]
    if (lastUserMsg?.role === 'user') {
      const content = lastUserMsg.content
      const savedAttachments = lastUserMsg.attachments ?? []
      conv.messages.pop()
      await sendMessage(content, savedAttachments)
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
    parseMarkdown,
  }
}
