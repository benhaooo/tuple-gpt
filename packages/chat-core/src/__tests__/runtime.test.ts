import { describe, expect, it } from 'vitest'
import { FinishReason, StreamEventType } from '@tuple-gpt/ai-core'
import { streamAssistantReply, type ChatRuntimeEvent, type ChatStreamRunner } from '../runtime'
import type { ChatMessage, Provider } from '../types'

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
  { id: 'u1', role: 'user', content: 'hello', status: 'done', timestamp },
]

async function collect(input: AsyncIterable<ChatRuntimeEvent>): Promise<ChatRuntimeEvent[]> {
  const events: ChatRuntimeEvent[] = []
  for await (const event of input) {
    events.push(event)
  }
  return events
}

describe('streamAssistantReply', () => {
  it('emits start, delta, and done events', async () => {
    const chat: ChatStreamRunner = async function* (_messages, _config) {
      yield { type: StreamEventType.TextDelta, text: 'hel' }
      yield { type: StreamEventType.TextDelta, text: 'lo' }
      yield { type: StreamEventType.Finish, finishReason: FinishReason.Stop }
    }

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        history,
        provider,
        model: 'gpt-4o',
        chat,
        createId: () => 'assistant-1',
        now: () => timestamp,
      }),
    )

    expect(events.map(event => event.type)).toEqual([
      'assistant_started',
      'assistant_delta',
      'assistant_delta',
      'assistant_done',
    ])
    expect(events[1]).toMatchObject({ content: 'hel' })
    expect(events[2]).toMatchObject({ content: 'hello' })
  })

  it('emits assistant_error when the stream yields an error event', async () => {
    const chat: ChatStreamRunner = async function* (_messages, _config) {
      yield { type: StreamEventType.Error, error: new Error('boom') }
    }

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        history,
        provider,
        model: 'gpt-4o',
        chat,
        createId: () => 'assistant-1',
        now: () => timestamp,
      }),
    )

    expect(events.map(event => event.type)).toEqual(['assistant_started', 'assistant_error'])
    expect(events[1]).toMatchObject({ error: 'boom' })
  })

  it('treats AbortError as a completed assistant message', async () => {
    const chat: ChatStreamRunner = () => ({
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const error = new Error('aborted')
            error.name = 'AbortError'
            throw error
          },
        }
      },
    })

    const events = await collect(
      streamAssistantReply({
        conversationId: 'conv-1',
        history,
        provider,
        model: 'gpt-4o',
        chat,
        createId: () => 'assistant-1',
        now: () => timestamp,
      }),
    )

    expect(events.map(event => event.type)).toEqual(['assistant_started', 'assistant_done'])
  })
})
