import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAnthropicTransport } from '../transport/providers/anthropic'
import type { ToolDefinition } from '../types'
import { collect, createReadableStream } from './helpers'

function createSSEStream(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw = events
    .map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    .join('')
  return createReadableStream(raw)
}

function mockFetch(events: Record<string, unknown>[]) {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(createSSEStream(events), { status: 200 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function getRequestBody(fetchMock: ReturnType<typeof mockFetch>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1]
  if (!init?.body) throw new Error('Expected fetch body')
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

const provider = {
  type: 'anthropic' as const,
  apiKey: 'key',
  baseUrl: 'https://api.anthropic.com/v1',
  model: 'claude-sonnet-4-20250514',
  webSearch: true,
}

describe('createAnthropicTransport web search', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds the web_search server tool without replacing function tools', async () => {
    const fetchMock = mockFetch([
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: 2, output_tokens: 1 },
      },
    ])
    const transport = createAnthropicTransport()
    const tools: ToolDefinition[] = [
      {
        name: 'lookup',
        description: 'Lookup data',
        parameters: { type: 'object', properties: {} },
      },
    ]

    await collect(
      transport.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Search for this' }] }],
        provider,
        tools,
      }),
    )

    const body = getRequestBody(fetchMock)
    expect(body.tools).toEqual(
      expect.arrayContaining([
        {
          name: 'lookup',
          description: 'Lookup data',
          input_schema: { type: 'object', properties: {} },
        },
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ]),
    )
    expect(body.tools).toHaveLength(2)
  })
})
