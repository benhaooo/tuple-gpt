import {
  addMessage,
  createConversation,
  deleteConversation as deleteConversationFromList,
  deleteMessage as deleteMessageFromList,
  getActiveConversation,
  renameConversation as renameConversationInList,
  updateMessageContent,
  updateMessageStatus,
  upsertConversation,
} from './conversation'
import {
  prepareRegenerateAssistantMessage,
  prepareResendFromUserMessage,
  prepareSaveUserMessage,
  prepareSendMessage,
} from './flow'
import { streamAssistantReply, type ChatRuntimeEvent } from './runtime'
import type { ChatMessage, Conversation, MessageAttachment } from './types'
import {
  cloneStorageSnapshot,
  normalizeStorageSnapshot,
  type ActiveChatRequestConfig,
  type ChatSnapshot,
  type ChatSnapshotListener,
  type ChatStorage,
  type ChatStorageSnapshot,
} from './ports'

export interface ChatRuntimeOptions {
  storage: ChatStorage
}

export interface SendMessageInput {
  content: string
  config: ActiveChatRequestConfig
  attachments?: MessageAttachment[]
}

export interface ChatRuntime {
  hydrate(): Promise<void>
  destroy(): void
  getSnapshot(): ChatSnapshot
  subscribe(listener: ChatSnapshotListener): () => void
  sendMessage(input: SendMessageInput): Promise<void>
  stopStreaming(conversationId?: string): void
  newConversation(config: ActiveChatRequestConfig): Promise<Conversation | null>
  setActiveConversation(id: string): Promise<void>
  deleteConversation(id: string): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  deleteMessage(messageId: string): Promise<void>
  saveUserMessage(messageId: string, content: string): Promise<void>
  resendFromUserMessage(
    messageId: string,
    content: string,
    config: ActiveChatRequestConfig,
  ): Promise<void>
  regenerateAssistantMessage(messageId: string, config: ActiveChatRequestConfig): Promise<void>
  retryLastMessage(config: ActiveChatRequestConfig): Promise<void>
  clearAll(): Promise<void>
}

interface ChatRuntimeState extends ChatStorageSnapshot {
  isReady: boolean
  streamingConversationIds: string[]
}

function toSnapshot(state: ChatRuntimeState): ChatSnapshot {
  const activeConversation = getActiveConversation(state.conversations, state.activeConversationId)
  const streamingConversationIds = [...state.streamingConversationIds]
  return {
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    activeConversation,
    messages: activeConversation?.messages ?? [],
    isReady: state.isReady,
    streamingConversationIds,
    isStreaming:
      !!state.activeConversationId && streamingConversationIds.includes(state.activeConversationId),
  }
}

function toStorageSnapshot(state: ChatRuntimeState): ChatStorageSnapshot {
  return {
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
  }
}

export function createChatRuntime(options: ChatRuntimeOptions): ChatRuntime {
  const { storage } = options
  const listeners = new Set<ChatSnapshotListener>()
  let state: ChatRuntimeState = {
    conversations: [],
    activeConversationId: null,
    isReady: false,
    streamingConversationIds: [],
  }
  let hydratePromise: Promise<void> | null = null
  let unsubscribeStorage: (() => void) | null = null
  let persistPromise = Promise.resolve()
  const abortControllers = new Map<string, AbortController>()

  function emit() {
    const snapshot = toSnapshot(state)
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  async function persist() {
    const snapshot = cloneStorageSnapshot(toStorageSnapshot(state))
    const nextPersist = persistPromise.then(() => storage.save(snapshot))
    persistPromise = nextPersist.catch(() => undefined)
    await nextPersist
  }

  async function setState(nextState: ChatRuntimeState, persistState = true) {
    state = nextState
    emit()
    if (persistState) {
      await persist()
    }
  }

  async function patchStorageSnapshot(snapshot: ChatStorageSnapshot, persistState = false) {
    const normalized = normalizeStorageSnapshot(snapshot)
    await setState(
      {
        ...state,
        conversations: normalized.conversations,
        activeConversationId: normalized.activeConversationId,
      },
      persistState,
    )
  }

  async function hydrate(): Promise<void> {
    if (hydratePromise) return hydratePromise

    hydratePromise = (async () => {
      try {
        const persisted = normalizeStorageSnapshot(await storage.load())
        state = {
          ...state,
          conversations: persisted.conversations,
          activeConversationId: persisted.activeConversationId,
          isReady: true,
        }
        emit()

        unsubscribeStorage =
          storage.subscribe?.(snapshot => {
            if (state.streamingConversationIds.length > 0) return
            patchStorageSnapshot(snapshot, false)
          }) ?? null
      } catch {
        state = {
          ...state,
          isReady: true,
        }
        emit()
      }
    })()

    return hydratePromise
  }

  async function ensureReady() {
    if (!state.isReady) {
      await hydrate()
    }
  }

  function isConversationStreaming(conversationId: string | null | undefined) {
    return !!conversationId && state.streamingConversationIds.includes(conversationId)
  }

  function addStreamingConversation(conversationId: string): ChatRuntimeState {
    if (isConversationStreaming(conversationId)) return state
    return {
      ...state,
      streamingConversationIds: [...state.streamingConversationIds, conversationId],
    }
  }

  function removeStreamingConversation(conversationId: string): ChatRuntimeState {
    return {
      ...state,
      streamingConversationIds: state.streamingConversationIds.filter(id => id !== conversationId),
    }
  }

  function getActiveConversationMessage(messageId: string) {
    const conversation = getActiveConversation(state.conversations, state.activeConversationId)
    if (!conversation) return null

    const index = conversation.messages.findIndex(message => message.id === messageId)
    if (index === -1) return null

    return {
      conversation,
      index,
      message: conversation.messages[index],
    }
  }

  async function replaceConversation(conversation: Conversation) {
    await setState({
      ...state,
      conversations: upsertConversation(state.conversations, conversation),
      activeConversationId: conversation.id,
    })
  }

  function applyRuntimeEvent(event: ChatRuntimeEvent): ChatRuntimeState {
    switch (event.type) {
      case 'assistant_started': {
        const conversation = state.conversations.find(item => item.id === event.conversationId)
        if (!conversation) return state

        const result = addMessage(conversation, event.message)
        return {
          ...state,
          conversations: upsertConversation(state.conversations, result.conversation),
        }
      }
      case 'assistant_delta':
        return {
          ...state,
          conversations: updateMessageContent(
            state.conversations,
            event.conversationId,
            event.messageId,
            event.content,
          ),
        }
      case 'assistant_done':
        return {
          ...state,
          conversations: updateMessageStatus(
            state.conversations,
            event.conversationId,
            event.messageId,
            'done',
          ),
        }
      case 'assistant_error':
        return {
          ...state,
          conversations: updateMessageStatus(
            state.conversations,
            event.conversationId,
            event.messageId,
            'error',
            event.error,
          ),
        }
    }
  }

  async function runAssistantReply(
    conversationId: string,
    history: ChatMessage[],
    config: ActiveChatRequestConfig,
  ) {
    if (isConversationStreaming(conversationId)) return

    const abortController = new AbortController()
    abortControllers.set(conversationId, abortController)
    await setState(addStreamingConversation(conversationId), false)

    try {
      for await (const event of streamAssistantReply({
        conversationId,
        history,
        provider: config.provider,
        model: config.model,
        signal: abortController.signal,
      })) {
        await setState(applyRuntimeEvent(event))
      }
    } finally {
      abortControllers.delete(conversationId)
      await setState(removeStreamingConversation(conversationId), false)
    }
  }

  return {
    async hydrate() {
      await hydrate()
    },

    destroy() {
      for (const abortController of abortControllers.values()) {
        abortController.abort()
      }
      abortControllers.clear()
      unsubscribeStorage?.()
      unsubscribeStorage = null
      listeners.clear()
    },

    getSnapshot() {
      return toSnapshot(state)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async sendMessage(input) {
      await ensureReady()
      if (isConversationStreaming(state.activeConversationId)) return

      const attachments = input.attachments ?? []
      const prepared = prepareSendMessage({
        activeConversation: getActiveConversation(state.conversations, state.activeConversationId),
        providerId: input.config.provider.id,
        model: input.config.model,
        content: input.content,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      await replaceConversation(prepared.conversation)
      await runAssistantReply(prepared.conversation.id, prepared.requestHistory, input.config)
    },

    stopStreaming(conversationId) {
      const targetConversationId = conversationId ?? state.activeConversationId
      if (targetConversationId) {
        abortControllers.get(targetConversationId)?.abort()
      }
    },

    async newConversation(config) {
      await ensureReady()
      const conversation = createConversation({
        providerId: config.provider.id,
        model: config.model,
      })

      await replaceConversation(conversation)
      return conversation
    },

    async setActiveConversation(id) {
      await ensureReady()
      if (!state.conversations.some(conversation => conversation.id === id)) return
      await setState({ ...state, activeConversationId: id })
    },

    async deleteConversation(id) {
      await ensureReady()
      abortControllers.get(id)?.abort()
      abortControllers.delete(id)

      const result = deleteConversationFromList(state.conversations, state.activeConversationId, id)
      await setState({
        ...state,
        conversations: result.conversations,
        activeConversationId: result.activeConversationId,
        streamingConversationIds: state.streamingConversationIds.filter(
          conversationId => conversationId !== id,
        ),
      })
    },

    async renameConversation(id, title) {
      await ensureReady()
      await setState({
        ...state,
        conversations: renameConversationInList(state.conversations, id, title),
      })
    },

    async deleteMessage(messageId) {
      await ensureReady()
      const conversationId = state.activeConversationId
      if (!conversationId) return

      await setState({
        ...state,
        conversations: deleteMessageFromList(state.conversations, conversationId, messageId),
      })
    },

    async saveUserMessage(messageId, content) {
      await ensureReady()
      const target = getActiveConversationMessage(messageId)
      if (!target || target.message.role !== 'user') return

      const conversation = prepareSaveUserMessage(target.conversation, messageId, content)
      if (conversation) {
        await replaceConversation(conversation)
      }
    },

    async resendFromUserMessage(messageId, content, config) {
      await ensureReady()

      const target = getActiveConversationMessage(messageId)
      if (!target || target.message.role !== 'user') return
      if (isConversationStreaming(target.conversation.id)) return

      const prepared = prepareResendFromUserMessage(target.conversation, messageId, content)
      if (!prepared) return

      await replaceConversation(prepared.conversation)
      await runAssistantReply(prepared.conversation.id, prepared.requestHistory, config)
    },

    async regenerateAssistantMessage(messageId, config) {
      await ensureReady()

      const target = getActiveConversationMessage(messageId)
      if (!target || target.message.role !== 'assistant') return
      if (isConversationStreaming(target.conversation.id)) return

      const prepared = prepareRegenerateAssistantMessage(target.conversation, messageId)
      if (!prepared) return

      await replaceConversation(prepared.conversation)
      await runAssistantReply(prepared.conversation.id, prepared.requestHistory, config)
    },

    async retryLastMessage(config) {
      await ensureReady()
      const conversation = getActiveConversation(state.conversations, state.activeConversationId)
      if (!conversation) return
      if (isConversationStreaming(conversation.id)) return

      const lastAssistant = [...conversation.messages]
        .reverse()
        .find(message => message.role === 'assistant')
      if (lastAssistant) {
        const prepared = prepareRegenerateAssistantMessage(conversation, lastAssistant.id)
        if (!prepared) return

        await replaceConversation(prepared.conversation)
        await runAssistantReply(prepared.conversation.id, prepared.requestHistory, config)
        return
      }

      const lastUser = [...conversation.messages].reverse().find(message => message.role === 'user')
      if (lastUser) {
        const prepared = prepareResendFromUserMessage(conversation, lastUser.id, lastUser.content)
        if (!prepared) return

        await replaceConversation(prepared.conversation)
        await runAssistantReply(prepared.conversation.id, prepared.requestHistory, config)
      }
    },

    async clearAll() {
      await ensureReady()
      for (const abortController of abortControllers.values()) {
        abortController.abort()
      }
      abortControllers.clear()

      await setState({
        ...state,
        conversations: [],
        activeConversationId: null,
        streamingConversationIds: [],
      })
    },
  }
}
