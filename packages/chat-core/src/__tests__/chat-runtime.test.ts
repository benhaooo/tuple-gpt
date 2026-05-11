import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatClient, FinishReason, StreamEventType } from '@tuple-gpt/ai-core'
import { createChatRuntime, type ChatRuntime } from '../chat-runtime'
import { cloneStorageSnapshot, normalizeStorageSnapshot } from '../ports'
import type {
  ActiveChatRequestConfig,
  ChatSnapshot,
  ChatStorage,
  ChatStorageSnapshot,
} from '../ports'
import type { ChatTurn, Conversation, Provider } from '#types'

const timestamp = '2026-04-29T00:00:00.000Z'

const provider: Provider = {
  id: 'provider-1',
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com',
  apiKey: 'key',
  format: 'openai',
  models: ['gpt-4o'],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const requestConfig: ActiveChatRequestConfig = {
  provider,
  model: 'gpt-4o',
}

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

function turn(id: string, userId = `${id}-u`, assistantId = `${id}-a`): ChatTurn {
  return {
    id,
    mode: 'chat',
    status: 'done',
    providerId: provider.id,
    model: 'gpt-4o',
    startedAt: timestamp,
    endedAt: timestamp,
    messages: [
      {
        id: userId,
        role: 'user',
        content: text(`question ${id}`),
        status: 'done',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: assistantId,
        role: 'assistant',
        content: text(`answer ${id}`),
        status: 'done',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  }
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Chat',
    createdAt: timestamp,
    updatedAt: timestamp,
    turns: [],
    ...overrides,
  }
}

async function loadRequiredSnapshot(storage: ChatStorage) {
  const snapshot = await storage.load()
  if (!snapshot) throw new Error('Expected storage snapshot')
  return snapshot
}

function createTestChatStorage(initial?: Partial<ChatStorageSnapshot>): ChatStorage {
  let snapshot = normalizeStorageSnapshot(initial)

  return {
    load() {
      return cloneStorageSnapshot(snapshot)
    },
    save(nextSnapshot) {
      snapshot = cloneStorageSnapshot(nextSnapshot)
    },
  }
}

function createAbortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

function waitForSnapshot(
  runtime: ChatRuntime,
  predicate: (snapshot: ChatSnapshot) => boolean,
): Promise<ChatSnapshot> {
  const currentSnapshot = runtime.getSnapshot()
  if (predicate(currentSnapshot)) {
    return Promise.resolve(currentSnapshot)
  }

  return new Promise(resolve => {
    const unsubscribe = runtime.subscribe(snapshot => {
      if (!predicate(snapshot)) return
      unsubscribe()
      resolve(snapshot)
    })
  })
}

describe('chat runtime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates conversations from storage and exposes turns in the snapshot', async () => {
    const storage = createTestChatStorage({
      conversations: [conversation({ turns: [turn('t1', 'u1', 'a1')] })],
      activeConversationId: 'conv-1',
    })

    const runtime = createChatRuntime({ storage })
    await runtime.hydrate()

    expect(runtime.getSnapshot()).toMatchObject({
      isReady: true,
      activeConversationId: 'conv-1',
      turns: [{ id: 't1' }],
    })
  })

  it('sends a message, updates turn state, and persists the conversation', async () => {
    const storage = createTestChatStorage()
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.TextDelta, text: 'ok' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const runtime = createChatRuntime({ storage })

    await runtime.hydrate()
    await runtime.sendMessage({
      content: 'summarize',
      config: requestConfig,
      attachments: [
        {
          id: 'tab-1',
          type: 'tab',
          title: 'Example',
          extractedContent: 'page content',
        },
      ],
    })

    const snapshot = runtime.getSnapshot()
    const createdTurn = snapshot.turns[0]
    expect(snapshot.isStreaming).toBe(false)
    expect(snapshot.conversations).toHaveLength(1)
    expect(createdTurn).toMatchObject({
      mode: 'chat',
      status: 'done',
      providerId: provider.id,
      model: 'gpt-4o',
    })
    expect(createdTurn?.messages.map(message => message.role)).toEqual(['user', 'assistant'])
    expect(createdTurn?.messages[0]).toMatchObject({
      content: [{ type: 'text', text: 'summarize' }],
      attachments: [{ id: 'tab-1' }],
    })
    expect(createdTurn?.messages[1]).toMatchObject({
      content: [{ type: 'text', text: 'ok' }],
      status: 'done',
    })

    const persisted = await loadRequiredSnapshot(storage)
    expect(persisted.conversations[0]?.turns[0]?.messages.map(message => message.role)).toEqual([
      'user',
      'assistant',
    ])
  })

  it('persists agent tool messages inside a single turn', async () => {
    const storage = createTestChatStorage()
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.ToolCallStart, toolCall: { id: 'tc1', name: 'search' } }
      yield { type: StreamEventType.ToolCallDelta, toolCallId: 'tc1', arguments: '{"q":"x"}' }
      yield { type: StreamEventType.ToolCallEnd, toolCallId: 'tc1' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.ToolCalls }
      yield { type: StreamEventType.ToolResult, toolCallId: 'tc1', result: 'found' }
      yield { type: StreamEventType.TextDelta, text: 'done' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const runtime = createChatRuntime({ storage })
    await runtime.hydrate()
    await runtime.sendMessage({
      content: 'search',
      config: { ...requestConfig, mode: 'agent' },
    })

    expect(runtime.getSnapshot().turns[0]?.messages.map(message => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
    ])
  })

  it('regenerates a turn by replacing that turn and dropping following turns', async () => {
    const initialState: ChatStorageSnapshot = {
      activeConversationId: 'conv-1',
      conversations: [
        conversation({
          turns: [turn('t1', 'u1', 'a1'), turn('t2', 'u2', 'a2')],
        }),
      ],
    }
    const storage = createTestChatStorage(initialState)
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.TextDelta, text: 'new answer' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const runtime = createChatRuntime({ storage })

    await runtime.hydrate()
    await runtime.regenerateTurn('t2', requestConfig)

    const turns = runtime.getSnapshot().turns
    expect(turns.map(item => item.id)).toEqual(['t1', 't2'])
    expect(turns[1]?.messages.map(message => message.role)).toEqual(['user', 'assistant'])
    expect(turns[1]?.messages[1]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'new answer' }],
      status: 'done',
    })
  })

  it('scopes streaming state to the active conversation', async () => {
    const storage = createTestChatStorage({
      activeConversationId: 'conv-1',
      conversations: [
        conversation(),
        conversation({
          id: 'conv-2',
          title: 'Other chat',
        }),
      ],
    })
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* (_messages, config) {
      yield { type: StreamEventType.TextDelta, text: 'partial' }

      const signal = config.defaults?.signal
      if (!signal) throw new Error('Expected abort signal')
      if (signal.aborted) throw createAbortError()

      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError()), { once: true })
      })
    })

    const runtime = createChatRuntime({ storage })
    await runtime.hydrate()

    const sendPromise = runtime.sendMessage({
      content: 'keep going',
      config: requestConfig,
    })

    const streamingSnapshot = await waitForSnapshot(runtime, snapshot => snapshot.isStreaming)
    const runningTurnId = streamingSnapshot.runningTurnIds[0]
    expect(streamingSnapshot).toMatchObject({
      activeConversationId: 'conv-1',
      isStreaming: true,
    })

    await runtime.setActiveConversation('conv-2')

    expect(runtime.getSnapshot()).toMatchObject({
      activeConversationId: 'conv-2',
      isStreaming: false,
      runningTurnIds: [runningTurnId],
    })

    runtime.stopStreaming(runningTurnId)
    await sendPromise

    expect(runtime.getSnapshot().runningTurnIds).toEqual([])
  })

  it('stops the active turn stream by default and marks it aborted', async () => {
    const storage = createTestChatStorage()
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* (_messages, config) {
      yield { type: StreamEventType.TextDelta, text: 'partial' }

      const signal = config.defaults?.signal
      if (!signal) throw new Error('Expected abort signal')
      if (signal.aborted) throw createAbortError()

      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError()), { once: true })
      })
    })

    const runtime = createChatRuntime({ storage })
    await runtime.hydrate()

    const sendPromise = runtime.sendMessage({
      content: 'stop me',
      config: requestConfig,
    })

    await waitForSnapshot(runtime, snapshot => snapshot.isStreaming)
    runtime.stopStreaming()
    await sendPromise

    expect(runtime.getSnapshot()).toMatchObject({
      isStreaming: false,
      runningTurnIds: [],
      turns: [{ status: 'aborted' }],
    })
  })
})
