import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGeminiInteractionsTransport } from '../transport/providers/gemini-interactions'
import type { ToolDefinition } from '../types'
import { collect, createReadableStream } from './helpers'

function createSSEStream(events: Array<{ event: string; data: Record<string, unknown> }>) {
  const raw = events
    .map(item => `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`)
    .join('')
  return createReadableStream(raw)
}

function mockFetch(events: Array<{ event: string; data: Record<string, unknown> }>) {
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
  type: 'gemini-interactions' as const,
  apiKey: 'key',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-2.5-pro',
  webSearch: true,
}

describe('createGeminiInteractionsTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to interactions and includes native google search with function tools', async () => {
    const fetchMock = mockFetch([
      {
        event: 'interaction.completed',
        data: {
          interaction: {
            steps: [],
            usageMetadata: {
              promptTokenCount: 2,
              candidatesTokenCount: 1,
              totalTokenCount: 3,
            },
          },
        },
      },
    ])
    const tools: ToolDefinition[] = [
      {
        name: 'lookup',
        description: 'Lookup data',
        parameters: { type: 'object', properties: {} },
      },
    ]
    const transport = createGeminiInteractionsTransport()

    await collect(
      transport.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Search for this' }] }],
        provider,
        tools,
      }),
    )

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/interactions?key=key&alt=sse',
    )
    const body = getRequestBody(fetchMock)
    expect(body.tools).toEqual(
      expect.arrayContaining([
        {
          type: 'function',
          name: 'lookup',
          description: 'Lookup data',
          parameters: { type: 'object', properties: {} },
        },
        { type: 'google_search' },
      ]),
    )
  })

  it('maps search steps, annotations, and thoughts to unified events', async () => {
    mockFetch([
      {
        event: 'step.start',
        data: {
          step: {
            id: 'search_1',
            type: 'google_search_call',
            arguments: { queries: ['OpenAI news'] },
            status: 'in_progress',
          },
        },
      },
      {
        event: 'step.completed',
        data: {
          step: {
            id: 'search_1',
            type: 'google_search_result',
            status: 'completed',
            groundingMetadata: {
              groundingChunks: [{ web: { uri: 'https://openai.com/news/', title: 'OpenAI' } }],
              groundingSupports: [
                {
                  segment: { startIndex: 0, endIndex: 8, text: 'Found it' },
                  groundingChunkIndices: [0],
                },
              ],
            },
          },
        },
      },
      {
        event: 'step.delta',
        data: {
          step: {
            id: 'thought_1',
            type: 'thought',
            text: 'Need to cite the result.',
            signature: 'sig_123',
          },
        },
      },
      {
        event: 'step.delta',
        data: {
          step: {
            id: 'out_1',
            type: 'model_output',
            text: 'Found it.',
            annotations: [
              {
                url: 'https://openai.com/news/',
                title: 'OpenAI',
                start_index: 0,
                end_index: 8,
              },
            ],
          },
        },
      },
      {
        event: 'interaction.completed',
        data: { interaction: { steps: [] } },
      },
    ])

    const transport = createGeminiInteractionsTransport()
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
            id: 'search_1',
            provider: 'gemini-interactions',
            kind: 'web_search',
            status: 'in_progress',
            action: { type: 'google_search_call', queries: ['OpenAI news'] },
          }),
        }),
        expect.objectContaining({
          type: 'native_tool_end',
          nativeToolId: 'search_1',
          status: 'completed',
          action: { type: 'google_search_call', queries: ['OpenAI news'] },
          sources: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://openai.com/news/',
              title: 'OpenAI',
              startIndex: 0,
              endIndex: 8,
            }),
          ]),
        }),
        expect.objectContaining({
          type: 'reasoning_state',
          reasoning: expect.objectContaining({
            id: 'thought_1',
            provider: 'gemini-interactions',
            summary: 'Need to cite the result.',
            encryptedContent: 'sig_123',
          }),
        }),
        { type: 'text_delta', text: 'Found it.' },
        expect.objectContaining({
          type: 'text_annotations',
          citations: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://openai.com/news/',
              title: 'OpenAI',
            }),
          ]),
        }),
      ]),
    )
  })
})
