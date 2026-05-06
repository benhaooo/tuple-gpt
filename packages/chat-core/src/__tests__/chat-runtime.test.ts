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
import type { Conversation, Provider } from '../types'

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

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Chat',
    providerId: provider.id,
    model: 'gpt-4o',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
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

  it('hydrates conversations from storage and exposes a derived snapshot', async () => {
    const storage = createTestChatStorage({
      conversations: [
        conversation({
          messages: [{ id: 'u1', role: 'user', content: 'hello', status: 'done', timestamp }],
        }),
      ],
      activeConversationId: 'conv-1',
    })

    const runtime = createChatRuntime({ storage })
    await runtime.hydrate()

    expect(runtime.getSnapshot()).toMatchObject({
      isReady: true,
      activeConversationId: 'conv-1',
      messages: [{ id: 'u1', content: 'hello' }],
    })
  })

  it('sends a message, updates core state, and persists the conversation', async () => {
    const storage = createTestChatStorage()
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.TextDelta, text: 'ok' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const runtime = createChatRuntime({
      storage,
    })

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
    expect(snapshot.isStreaming).toBe(false)
    expect(snapshot.conversations).toHaveLength(1)
    expect(snapshot.messages.map(message => message.role)).toEqual(['user', 'assistant'])
    expect(snapshot.messages[0]).toMatchObject({
      content: 'summarize',
      attachments: [{ id: 'tab-1' }],
    })
    expect(snapshot.messages[1]).toMatchObject({
      content: 'ok',
      status: 'done',
      providerId: provider.id,
      model: 'gpt-4o',
    })
    expect(snapshot.messages[0].id).toEqual(expect.any(String))
    expect(snapshot.messages[1].id).toEqual(expect.any(String))
    const persisted = await loadRequiredSnapshot(storage)
    expect(persisted.conversations[0].messages.map(message => message.role)).toEqual([
      'user',
      'assistant',
    ])
    expect(persisted.conversations[0].messages[1]).toMatchObject({
      providerId: provider.id,
      model: 'gpt-4o',
    })
  })

  it('regenerates an assistant message by truncating to the anchor user message', async () => {
    const initialState: ChatStorageSnapshot = {
      activeConversationId: 'conv-1',
      conversations: [
        conversation({
          messages: [
            { id: 'u1', role: 'user', content: 'first', status: 'done', timestamp },
            { id: 'a1', role: 'assistant', content: 'first answer', status: 'done', timestamp },
            { id: 'u2', role: 'user', content: 'second', status: 'done', timestamp },
            { id: 'a2', role: 'assistant', content: 'second answer', status: 'done', timestamp },
          ],
        }),
      ],
    }
    const storage = createTestChatStorage(initialState)
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.TextDelta, text: 'new answer' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const runtime = createChatRuntime({
      storage,
    })

    await runtime.hydrate()
    await runtime.regenerateAssistantMessage('a2', requestConfig)

    expect(
      runtime
        .getSnapshot()
        .messages.slice(0, 3)
        .map(message => message.id),
    ).toEqual(['u1', 'a1', 'u2'])
    expect(runtime.getSnapshot().messages[3].id).not.toBe('a2')
    expect(runtime.getSnapshot().messages[3]).toMatchObject({
      role: 'assistant',
      content: 'new answer',
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

    const streamingSnapshot = await waitForSnapshot(runtime, snapshot =>
      snapshot.streamingConversationIds.includes('conv-1'),
    )
    expect(streamingSnapshot).toMatchObject({
      activeConversationId: 'conv-1',
      isStreaming: true,
      streamingConversationIds: ['conv-1'],
    })

    await runtime.setActiveConversation('conv-2')

    expect(runtime.getSnapshot()).toMatchObject({
      activeConversationId: 'conv-2',
      isStreaming: false,
      streamingConversationIds: ['conv-1'],
    })

    runtime.stopStreaming('conv-1')
    await sendPromise

    expect(runtime.getSnapshot().streamingConversationIds).toEqual([])
  })

  it('stops the active conversation stream by default', async () => {
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
      streamingConversationIds: [],
    })
  })
})
