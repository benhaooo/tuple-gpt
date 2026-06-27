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

  it('maps server web search, citations, and thinking blocks to native events', async () => {
    mockFetch([
      {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'server_tool_use',
          id: 'srv_1',
          name: 'web_search',
        },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"query":"OpenAI news"}' },
      },
      {
        type: 'content_block_stop',
        index: 0,
      },
      {
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'web_search_tool_result',
          tool_use_id: 'srv_1',
          content: [{ title: 'OpenAI', url: 'https://openai.com/news/' }],
        },
      },
      {
        type: 'content_block_start',
        index: 2,
        content_block: { type: 'thinking' },
      },
      {
        type: 'content_block_delta',
        index: 2,
        delta: { type: 'thinking_delta', thinking: 'I should verify this.' },
      },
      {
        type: 'content_block_delta',
        index: 2,
        delta: { type: 'signature_delta', signature: 'sig_123' },
      },
      {
        type: 'content_block_delta',
        index: 3,
        delta: {
          type: 'text_delta',
          text: 'Found it.',
          citations: [
            {
              type: 'web_search_result_location',
              url: 'https://openai.com/news/',
              title: 'OpenAI',
              cited_text: 'Found it',
              start_char_index: 0,
              end_char_index: 8,
            },
          ],
        },
      },
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: 2, output_tokens: 1 },
      },
    ])

    const transport = createAnthropicTransport()
    const events = await collect(
      transport.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Search for this' }] }],
        provider,
      }),
    )

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'native_tool_start',
          nativeTool: expect.objectContaining({
            id: 'srv_1',
            provider: 'anthropic',
            kind: 'web_search',
            status: 'in_progress',
          }),
        }),
        expect.objectContaining({
          type: 'native_tool_end',
          nativeToolId: 'srv_1',
          status: 'completed',
          sources: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://openai.com/news/',
              title: 'OpenAI',
            }),
          ]),
          raw: expect.objectContaining({ type: 'web_search_tool_result' }),
        }),
        expect.objectContaining({
          type: 'reasoning_state',
          reasoning: expect.objectContaining({
            provider: 'anthropic',
            summary: 'I should verify this.',
            encryptedContent: 'sig_123',
          }),
        }),
        expect.objectContaining({
          type: 'text_annotations',
          citations: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://openai.com/news/',
              title: 'OpenAI',
              startIndex: 0,
              endIndex: 8,
            }),
          ]),
        }),
      ]),
    )
  })
})
