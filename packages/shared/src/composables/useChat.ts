import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useProviderStore } from '../stores/providerStore'
import { useConversationStore } from '../stores/conversationStore'
import { createAdapter } from '../adapters'
import type { BrowserTab } from './useBrowserTabs'
import { extractMultipleTabsContent, formatTabContentsAsContext } from './useTabContent'

export function useChat() {
  const providerStore = useProviderStore()
  const conversationStore = useConversationStore()

  const isStreaming = ref(false)
  const abortController = ref<AbortController | null>(null)

  const activeConversation = computed(() => conversationStore.getActiveConversation())
  const messages = computed(() => activeConversation.value?.messages ?? [])

  function parseMarkdown(content: string): string {
    if (!content) return ''
    return marked.parse(content, { async: false }) as string
  }

  async function sendMessage(content: string, tabs?: BrowserTab[]): Promise<void> {
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

    // 提取选中 tab 的页面内容，content 存入各自的 attachment
    let attachments: { tabId: number; title: string; url: string; extractedContent?: string }[] | undefined
    let contextStr = ''
    if (tabs && tabs.length > 0) {
      const tabContents = await extractMultipleTabsContent(tabs)
      console.log('[useChat] tabContents:', tabContents)
      attachments = tabContents.map(c => ({
        tabId: c.tabId,
        title: c.title,
        url: c.url,
        extractedContent: c.content || undefined,
      }))
      contextStr = formatTabContentsAsContext(tabContents.filter(c => !c.error))
      console.log('[useChat] contextStr length:', contextStr.length)
    }

    // Add user message（content 只存原文，attachments 存元信息+提取内容）
    conversationStore.addMessage(convId, {
      role: 'user',
      content,
      status: 'done',
      attachments,
    })

    // Add placeholder assistant message
    const assistantMsg = conversationStore.addMessage(convId, {
      role: 'assistant',
      content: '',
      status: 'streaming',
      providerId: provider.id,
    })

    isStreaming.value = true
    abortController.value = new AbortController()
    let accumulated = ''

    try {
      const adapter = createAdapter(provider.format)
      // 用快照拼接历史，再加上当前携带上下文的用户消息
      const apiMessages = [
        ...historySnapshot.map(msg => {
          const msgContextStr = formatTabContentsAsContext(
            (msg.attachments ?? [])
              .filter(a => a.extractedContent)
              .map(a => ({ tabId: a.tabId, title: a.title, url: a.url, content: a.extractedContent! })),
          )
          return msgContextStr ? { ...msg, content: msg.content + msgContextStr } : msg
        }),
        { role: 'user' as const, content: contextStr ? content + contextStr : content },
      ]
      const stream = adapter.sendMessage({
        messages: apiMessages,
        provider,
        model: selection.model,
        signal: abortController.value.signal,
        maxTokens: 4096,
      })

      for await (const chunk of stream) {
        accumulated += chunk
        conversationStore.updateMessageContent(convId!, assistantMsg.id, accumulated)
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
      conv.messages.pop()
      await sendMessage(content)
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
