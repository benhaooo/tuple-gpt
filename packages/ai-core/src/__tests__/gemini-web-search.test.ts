import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGeminiTransport } from '../transport/providers/gemini'
import type { ToolDefinition } from '../types'
import { collect, createReadableStream } from './helpers'

function createSSEStream(chunks: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('')
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
  type: 'gemini' as const,
  apiKey: 'key',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-2.5-pro',
  webSearch: true,
}

describe('createGeminiTransport web search', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds google_search without replacing function declarations', async () => {
    const fetchMock = mockFetch([
      {
        candidates: [
          {
            content: { parts: [{ text: 'Hi' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 1,
          totalTokenCount: 3,
        },
      },
    ])
    const transport = createGeminiTransport()
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
          functionDeclarations: [
            {
              name: 'lookup',
              description: 'Lookup data',
              parameters: { type: 'object', properties: {} },
            },
          ],
        },
        { google_search: {} },
      ]),
    )
    expect(body.tools).toHaveLength(2)
  })
})
