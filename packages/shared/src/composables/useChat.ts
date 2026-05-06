import { computed, onScopeDispose, shallowRef } from 'vue'
import {
  createChatRuntime,
  type ActiveChatRequestConfig,
  type ChatRuntime,
  type ChatSnapshot,
} from '@tuple-gpt/chat-core'
import { useProviderStore } from '../stores/providerStore'
import { usePlatform } from './usePlatform'
import { useFileAttachments } from './useFileAttachments'
import type { MessageAttachment } from '@tuple-gpt/chat-core'

let chatRuntime: ChatRuntime | null = null

export function useChat() {
  const providerStore = useProviderStore()
  const platform = usePlatform()
  const { attachments: fileAttachments, clear: clearFiles } = useFileAttachments()

  function getActiveRequestConfig(): ActiveChatRequestConfig {
    const selection = providerStore.activeModel
    const provider = providerStore.activeProvider
    if (!selection || !provider) {
      throw new Error('请先配置AI服务商')
    }
    return { provider, model: selection.model }
  }

  async function collectAttachments(): Promise<MessageAttachment[]> {
    const currentFileAttachments = [...fileAttachments.value]
    let platformAttachments: MessageAttachment[] = []

    if (platform.prepareContext) {
      const result = await platform.prepareContext()
      if (result) {
        platformAttachments = result.attachments
      }
    }

    return [...platformAttachments, ...currentFileAttachments]
  }

  async function clearAttachmentsAfterSend() {
    await platform.clearAfterSend?.()
    clearFiles()
  }

  let runtime = chatRuntime
  if (!runtime) {
    runtime = createChatRuntime({
      storage: platform.chatStorage,
    })
    chatRuntime = runtime
  }

  const snapshot = shallowRef<ChatSnapshot>(runtime.getSnapshot())

  const unsubscribe = runtime.subscribe(nextSnapshot => {
    snapshot.value = nextSnapshot
  })
  runtime.hydrate()

  onScopeDispose(() => {
    unsubscribe?.()
  })

  return {
    snapshot,
    isReady: computed(() => snapshot.value.isReady),
    isStreaming: computed(() => snapshot.value.isStreaming),
    streamingConversationIds: computed(() => snapshot.value.streamingConversationIds),
    conversations: computed(() => snapshot.value.conversations),
    activeConversationId: computed(() => snapshot.value.activeConversationId),
    activeConversation: computed(() => snapshot.value.activeConversation),
    messages: computed(() => snapshot.value.messages),
    async sendMessage(content: string) {
      await runtime.sendMessage({
        content,
        config: getActiveRequestConfig(),
        attachments: await collectAttachments(),
      })
      await clearAttachmentsAfterSend()
    },
    stopStreaming: () => runtime.stopStreaming(),
    newConversation: () => runtime.newConversation(getActiveRequestConfig()),
    setActiveConversation: (id: string) => runtime.setActiveConversation(id),
    deleteConversation: (id: string) => runtime.deleteConversation(id),
    renameConversation: (id: string, title: string) => runtime.renameConversation(id, title),
    deleteMessage: (messageId: string) => runtime.deleteMessage(messageId),
    retryLastMessage: () => runtime.retryLastMessage(getActiveRequestConfig()),
    saveUserMessage: (messageId: string, content: string) =>
      runtime.saveUserMessage(messageId, content),
    resendFromUserMessage: (messageId: string, content: string) =>
      runtime.resendFromUserMessage(messageId, content, getActiveRequestConfig()),
    regenerateAssistantMessage: (messageId: string) =>
      runtime.regenerateAssistantMessage(messageId, getActiveRequestConfig()),
  }
}
