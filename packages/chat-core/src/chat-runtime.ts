import {
  appendMessageToTurn,
  cancelOpenToolCalls,
  createConversation,
  deleteConversation as deleteConversationFromList,
  deleteTurn as deleteTurnFromList,
  flattenConversationMessages,
  getActiveConversation,
  renameConversation as renameConversationInList,
  updateMessageContent,
  updateMessageStatus,
  updateToolCallResult,
  updateToolCallStatus,
  updateTurnStatus,
  upsertConversation,
} from './conversation'
import {
  prepareRegenerateTurn,
  prepareResendTurn,
  prepareSaveUserMessage,
  prepareSendMessage,
} from './flow'
import { streamAssistantReply, type ChatRuntimeEvent } from './runtime'
import type { Conversation, MessageAttachment } from './types'
import type { Resolution } from '@tuple-gpt/ai-core'
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
  stopStreaming(turnId?: string): void
  /**
   * Resolve one suspended tool call. The runtime buffers resolutions per
   * turn and only re-launches the agent loop once every awaiting tool call
   * in the turn has a resolution. ai-core's resume phase then applies them
   * in order, re-running execute() on 'approve' and writing tool_result
   * messages on 'result' / 'deny'.
   */
  resolveToolCall(
    turnId: string,
    resolution: Resolution,
    config: ActiveChatRequestConfig,
  ): Promise<void>
  newConversation(): Promise<Conversation | null>
  setActiveConversation(id: string): Promise<void>
  deleteConversation(id: string): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  deleteTurn(turnId: string): Promise<void>
  saveUserMessage(turnId: string, content: string): Promise<void>
  resendTurn(turnId: string, content: string, config: ActiveChatRequestConfig): Promise<void>
  regenerateTurn(turnId: string, config: ActiveChatRequestConfig): Promise<void>
  retryLastTurn(config: ActiveChatRequestConfig): Promise<void>
  clearAll(): Promise<void>
}

interface ChatRuntimeState extends ChatStorageSnapshot {
  isReady: boolean
  runningTurnIds: string[]
}

function toSnapshot(state: ChatRuntimeState): ChatSnapshot {
  const activeConversation = getActiveConversation(state.conversations, state.activeConversationId)
  const runningTurnIds = [...state.runningTurnIds]

  return {
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    activeConversation,
    turns: activeConversation?.turns ?? [],
    isReady: state.isReady,
    runningTurnIds,
    isStreaming: runningTurnIds.some(turnId =>
      activeConversation?.turns.some(turn => turn.id === turnId),
    ),
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
    runningTurnIds: [],
  }
  let hydratePromise: Promise<void> | null = null
  let unsubscribeStorage: (() => void) | null = null
  let persistPromise = Promise.resolve()
  const abortControllers = new Map<string, AbortController>()
  /**
   * Buffer of resolutions submitted while a turn still has other awaiting
   * tool calls. Drained and forwarded to ai-core's resume phase once every
   * awaiting call in the turn has been resolved.
   */
  const pendingResolutions = new Map<string, Resolution[]>()

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
            if (state.runningTurnIds.length > 0) return
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

  function isTurnRunning(turnId: string | null | undefined) {
    return !!turnId && state.runningTurnIds.includes(turnId)
  }

  function isConversationRunning(conversation: Conversation | null | undefined) {
    return !!conversation?.turns.some(turn => isTurnRunning(turn.id))
  }

  function addRunningTurn(turnId: string): ChatRuntimeState {
    if (isTurnRunning(turnId)) return state
    return {
      ...state,
      runningTurnIds: [...state.runningTurnIds, turnId],
    }
  }

  function removeRunningTurn(turnId: string): ChatRuntimeState {
    return {
      ...state,
      runningTurnIds: state.runningTurnIds.filter(id => id !== turnId),
    }
  }

  function getActiveConversationTurn(turnId: string) {
    const conversation = getActiveConversation(state.conversations, state.activeConversationId)
    if (!conversation) return null

    const index = conversation.turns.findIndex(turn => turn.id === turnId)
    if (index === -1) return null

    return {
      conversation,
      index,
      turn: conversation.turns[index],
    }
  }

  function getDefaultStopTurnId() {
    const activeConversation = getActiveConversation(
      state.conversations,
      state.activeConversationId,
    )
    const activeRunningTurn = [...(activeConversation?.turns ?? [])]
      .reverse()
      .find(turn => isTurnRunning(turn.id))

    return activeRunningTurn?.id ?? state.runningTurnIds[0]
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
      case 'assistant_started':
        return {
          ...state,
          conversations: appendMessageToTurn(
            state.conversations,
            event.conversationId,
            event.turnId,
            event.message,
          ),
        }
      case 'assistant_delta':
        return {
          ...state,
          conversations: updateMessageContent(
            state.conversations,
            event.conversationId,
            event.turnId,
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
            event.turnId,
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
            event.turnId,
            event.messageId,
            'error',
            event.error,
          ),
        }
      case 'tool_call_status':
        return {
          ...state,
          conversations: updateToolCallStatus(
            state.conversations,
            event.conversationId,
            event.turnId,
            event.toolCallId,
            event.status,
          ),
        }
      case 'tool_call_result':
        return {
          ...state,
          conversations: updateToolCallResult(
            state.conversations,
            event.conversationId,
            event.turnId,
            event.toolCallId,
            event.result,
            event.isError,
          ),
        }
      case 'turn_paused':
        return state
      case 'turn_done':
        return {
          ...state,
          conversations: updateTurnStatus(
            state.conversations,
            event.conversationId,
            event.turnId,
            'done',
          ),
        }
      case 'turn_error':
        return {
          ...state,
          conversations: updateTurnStatus(
            cancelOpenToolCalls(state.conversations, event.conversationId, event.turnId),
            event.conversationId,
            event.turnId,
            'error',
            event.error,
          ),
        }
      case 'turn_aborted':
        return {
          ...state,
          conversations: updateTurnStatus(
            cancelOpenToolCalls(state.conversations, event.conversationId, event.turnId),
            event.conversationId,
            event.turnId,
            'aborted',
          ),
        }
    }
  }

  async function runTurnReply(
    conversationId: string,
    turnId: string,
    history: SendMessageHistory,
    config: ActiveChatRequestConfig,
    resolutions?: Resolution[],
  ) {
    if (isTurnRunning(turnId)) return

    const abortController = new AbortController()
    abortControllers.set(turnId, abortController)
    await setState(addRunningTurn(turnId), false)

    try {
      for await (const event of streamAssistantReply({
        conversationId,
        turnId,
        history: history.messages,
        provider: config.provider,
        model: config.model,
        tools: config.tools,
        resolutions,
        maxTurns: config.maxTurns,
        signal: abortController.signal,
      })) {
        await setState(applyRuntimeEvent(event))
      }
    } finally {
      abortControllers.delete(turnId)
      await setState(removeRunningTurn(turnId), false)
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
      pendingResolutions.clear()
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
      const activeConversation = getActiveConversation(
        state.conversations,
        state.activeConversationId,
      )
      if (isConversationRunning(activeConversation)) return

      const attachments = input.attachments ?? []
      const prepared = prepareSendMessage({
        activeConversation,
        providerId: input.config.provider.id,
        model: input.config.model,
        content: input.content,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      await replaceConversation(prepared.conversation)
      await runTurnReply(
        prepared.conversation.id,
        prepared.turn.id,
        { messages: prepared.requestHistory },
        input.config,
      )
    },

    stopStreaming(turnId) {
      const targetTurnId = turnId ?? getDefaultStopTurnId()
      if (targetTurnId) {
        abortControllers.get(targetTurnId)?.abort()
      }
    },

    async newConversation() {
      await ensureReady()
      const conversation = createConversation()
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
      const conversation = state.conversations.find(item => item.id === id)
      for (const turn of conversation?.turns ?? []) {
        abortControllers.get(turn.id)?.abort()
        abortControllers.delete(turn.id)
        pendingResolutions.delete(turn.id)
      }

      const result = deleteConversationFromList(state.conversations, state.activeConversationId, id)
      await setState({
        ...state,
        conversations: result.conversations,
        activeConversationId: result.activeConversationId,
        runningTurnIds: state.runningTurnIds.filter(
          turnId => !conversation?.turns.some(turn => turn.id === turnId),
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

    async deleteTurn(turnId) {
      await ensureReady()
      const conversationId = state.activeConversationId
      if (!conversationId) return

      abortControllers.get(turnId)?.abort()
      abortControllers.delete(turnId)
      pendingResolutions.delete(turnId)

      await setState({
        ...state,
        conversations: deleteTurnFromList(state.conversations, conversationId, turnId),
        runningTurnIds: state.runningTurnIds.filter(id => id !== turnId),
      })
    },

    async saveUserMessage(turnId, content) {
      await ensureReady()
      const target = getActiveConversationTurn(turnId)
      if (!target || isTurnRunning(turnId)) return

      const conversation = prepareSaveUserMessage(target.conversation, turnId, content)
      if (conversation) {
        await replaceConversation(conversation)
      }
    },

    async resendTurn(turnId, content, config) {
      await ensureReady()
      const target = getActiveConversationTurn(turnId)
      if (!target || isTurnRunning(turnId)) return

      const prepared = prepareResendTurn(target.conversation, turnId, content)
      if (!prepared) return

      await replaceConversation(prepared.conversation)
      await runTurnReply(
        prepared.conversation.id,
        prepared.turn.id,
        { messages: prepared.requestHistory },
        config,
      )
    },

    async regenerateTurn(turnId, config) {
      await ensureReady()
      const target = getActiveConversationTurn(turnId)
      if (!target || isTurnRunning(turnId)) return

      const prepared = prepareRegenerateTurn(target.conversation, turnId)
      if (!prepared) return

      await replaceConversation(prepared.conversation)
      await runTurnReply(
        prepared.conversation.id,
        prepared.turn.id,
        { messages: prepared.requestHistory },
        config,
      )
    },

    async retryLastTurn(config) {
      await ensureReady()
      const conversation = getActiveConversation(state.conversations, state.activeConversationId)
      if (!conversation || isConversationRunning(conversation)) return

      const lastTurn = conversation.turns[conversation.turns.length - 1]
      if (!lastTurn) return

      const prepared = prepareRegenerateTurn(conversation, lastTurn.id)
      if (!prepared) return

      await replaceConversation(prepared.conversation)
      await runTurnReply(
        prepared.conversation.id,
        prepared.turn.id,
        { messages: prepared.requestHistory },
        config,
      )
    },

    async clearAll() {
      await ensureReady()
      for (const abortController of abortControllers.values()) {
        abortController.abort()
      }
      abortControllers.clear()
      pendingResolutions.clear()

      await setState({
        ...state,
        conversations: [],
        activeConversationId: null,
        runningTurnIds: [],
      })
    },

    async resolveToolCall(turnId, resolution, config) {
      await ensureReady()
      const target = getActiveConversationTurn(turnId)
      if (!target) return
      if (isTurnRunning(turnId)) return

      // Only awaiting tool calls accept resolutions.
      const targetCall = findToolCall(target.turn, resolution.toolCallId)
      if (targetCall?.status !== 'awaiting') return

      const conversationId = target.conversation.id

      // Buffer this resolution. ai-core's resume phase will produce the
      // tool_result message and emit the matching status events.
      const buffered = pendingResolutions.get(turnId) ?? []
      buffered.push(resolution)
      pendingResolutions.set(turnId, buffered)

      // If the turn still has other awaiting calls, wait for them too.
      const otherAwaitingExists = target.turn.messages.some(message => {
        if (message.role !== 'assistant') return false
        return message.content.some(part => {
          if (part.type !== 'tool_call') return false
          if (part.status !== 'awaiting') return false
          return !buffered.some(r => r.toolCallId === part.toolCall.id)
        })
      })
      if (otherAwaitingExists) return

      pendingResolutions.delete(turnId)

      await runTurnReply(
        conversationId,
        turnId,
        { messages: flattenConversationMessages(target.conversation) },
        config,
        buffered,
      )
    },
  }
}

function findToolCall(
  turn: { messages: Conversation['turns'][number]['messages'] },
  toolCallId: string,
) {
  for (const message of turn.messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.content) {
      if (part.type === 'tool_call' && part.toolCall.id === toolCallId) return part
    }
  }
  return undefined
}

interface SendMessageHistory {
  messages: Parameters<typeof streamAssistantReply>[0]['history']
}
