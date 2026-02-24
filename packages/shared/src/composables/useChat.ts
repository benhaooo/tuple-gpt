import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useProviderStore } from '../stores/providerStore'
import { useConversationStore } from '../stores/conversationStore'
import { createAdapter } from '../adapters'

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

  async function sendMessage(content: string): Promise<void> {
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

    // Add user message
    conversationStore.addMessage(convId, {
      role: 'user',
      content,
      status: 'done',
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
      // Send all messages except the empty assistant placeholder
      const historyMessages = messages.value.slice(0, -1)
      const stream = adapter.sendMessage({
        messages: historyMessages,
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
