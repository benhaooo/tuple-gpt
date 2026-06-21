import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOpenAITransport } from '../transport/providers/openai'
import type { ToolDefinition } from '../types'
import { collect, createReadableStream } from './helpers'

function createSSEStream(chunks: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw =
    chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n'
  return createReadableStream(raw)
}

function mockFetch(chunks: Record<string, unknown>[]) {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response(createSSEStream(chunks), { status: 200 }),
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
  type: 'openai' as const,
  apiKey: 'key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-5-search-api',
  webSearch: true,
}

describe('createOpenAITransport web search', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds web_search_options without replacing function tools', async () => {
    const fetchMock = mockFetch([
      {
        choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
      },
      {
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
      },
    ])
    const transport = createOpenAITransport()
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
    expect(body.web_search_options).toEqual({})
    expect(body.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'lookup',
          description: 'Lookup data',
          parameters: { type: 'object', properties: {} },
        },
      },
    ])
  })
})
