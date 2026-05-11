import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatClient, FinishReason, StreamEventType } from '@tuple-gpt/ai-core'
import { streamAssistantReply, type ChatRuntimeEvent } from '../runtime'
import type { ChatMessage, Provider } from '#types'

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

const history: ChatMessage[] = [
  {
    id: 'u1',
    role: 'user',
    content: [{ type: 'text', text: 'hello' }],
    status: 'done',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
]

async function collect(input: AsyncIterable<ChatRuntimeEvent>): Promise<ChatRuntimeEvent[]> {
  const events: ChatRuntimeEvent[] = []
  for await (const event of input) {
    events.push(event)
  }
  return events
}

describe('streamAssistantReply', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits start, delta, assistant done, and turn done events', async () => {
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.TextDelta, text: 'hel' }
      yield { type: StreamEventType.TextDelta, text: 'lo' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        mode: 'chat',
        history,
        provider,
        model: 'gpt-4o',
        now: () => timestamp,
      }),
    )

    expect(events.map(event => event.type)).toEqual([
      'assistant_started',
      'assistant_delta',
      'assistant_delta',
      'assistant_done',
      'turn_done',
    ])
    expect(events[1]).toMatchObject({
      content: [{ type: 'text', text: 'hel' }],
    })
    expect(events[2]).toMatchObject({
      content: [{ type: 'text', text: 'hello' }],
    })
  })

  it('emits tool messages between assistant tool call and final assistant response', async () => {
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.ToolCallStart, toolCall: { id: 'tc1', name: 'search' } }
      yield { type: StreamEventType.ToolCallDelta, toolCallId: 'tc1', arguments: '{"q":"x"}' }
      yield { type: StreamEventType.ToolCallEnd, toolCallId: 'tc1' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.ToolCalls }
      yield { type: StreamEventType.ToolResult, toolCallId: 'tc1', result: 'found' }
      yield { type: StreamEventType.TextDelta, text: 'done' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    })

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        mode: 'agent',
        history,
        provider,
        model: 'gpt-4o',
        now: () => timestamp,
      }),
    )

    expect(events.map(event => event.type)).toEqual([
      'assistant_started',
      'assistant_delta',
      'assistant_delta',
      'assistant_done',
      'tool_message',
      'assistant_started',
      'assistant_delta',
      'assistant_done',
      'turn_done',
    ])
    expect(events[4]).toMatchObject({
      message: {
        role: 'tool',
        content: [{ type: 'tool_result', toolCallId: 'tc1', result: 'found' }],
      },
    })
  })

  it('emits assistant_error and turn_error when the stream yields an error event', async () => {
    vi.spyOn(ChatClient, 'chat').mockImplementation(async function* () {
      yield { type: StreamEventType.Error, error: new Error('boom') }
    })

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        mode: 'chat',
        history,
        provider,
        model: 'gpt-4o',
      }),
    )

    expect(events.map(event => event.type)).toEqual([
      'assistant_started',
      'assistant_error',
      'turn_error',
    ])
    expect(events[1]).toMatchObject({ error: 'boom' })
    expect(events[2]).toMatchObject({ error: 'boom' })
  })

  it('treats AbortError as an aborted turn', async () => {
    vi.spyOn(ChatClient, 'chat').mockImplementation(() => ({
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const error = new Error('aborted')
            error.name = 'AbortError'
            throw error
          },
        }
      },
    }))

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        mode: 'chat',
        history,
        provider,
        model: 'gpt-4o',
      }),
    )

    expect(events.map(event => event.type)).toEqual([
      'assistant_started',
      'assistant_done',
      'turn_aborted',
    ])
  })
})
