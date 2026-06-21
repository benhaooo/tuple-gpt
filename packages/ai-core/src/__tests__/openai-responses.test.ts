import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOpenAIResponsesTransport } from '../transport/providers/openai-responses'
import { FinishReason, StreamEventType } from '../types'
import type { Message, ToolDefinition } from '../types'
import { collect, createReadableStream } from './helpers'

function createSSEStream(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw =
    events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('') +
    'data: [DONE]\n\n'
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
  type: 'openai-responses' as const,
  apiKey: 'key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-5.4',
}

describe('createOpenAIResponsesTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to /responses and maps text streaming events', async () => {
    const fetchMock = mockFetch([
      {
        type: 'response.output_text.delta',
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        delta: 'Hi',
        sequence_number: 1,
      },
      {
        type: 'response.completed',
        response: {
          status: 'completed',
          output: [],
          usage: {
            input_tokens: 2,
            output_tokens: 1,
            total_tokens: 3,
          },
        },
        sequence_number: 2,
      },
    ])
    const transport = createOpenAIResponsesTransport()

    const events = await collect(
      transport.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
        provider,
        options: { maxTokens: 20, temperature: 0 },
      }),
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(getRequestBody(fetchMock)).toMatchObject({
      model: 'gpt-5.4',
      input: [{ type: 'message', role: 'user', content: 'Hello' }],
      stream: true,
      store: false,
      max_output_tokens: 20,
      temperature: 0,
    })
    expect(events).toEqual([
      { type: StreamEventType.TextDelta, text: 'Hi' },
      {
        type: StreamEventType.Finish,
        finishReason: FinishReason.Stop,
        usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 },
      },
    ])
  })

  it('formats image and PDF input parts for Responses content', async () => {
    const fetchMock = mockFetch([
      {
        type: 'response.completed',
        response: { status: 'completed', output: [] },
        sequence_number: 1,
      },
    ])
    const transport = createOpenAIResponsesTransport()

    await collect(
      transport.stream({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Inspect these files' },
              { type: 'image', image: 'image_base64', mimeType: 'image/png' },
              { type: 'image', image: 'pdf_base64', mimeType: 'application/pdf' },
            ],
          },
        ],
        provider,
      }),
    )

    expect(getRequestBody(fetchMock)).toMatchObject({
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_text', text: 'Inspect these files' },
            { type: 'input_image', image_url: 'data:image/png;base64,image_base64' },
            { type: 'input_file', file_data: 'data:application/pdf;base64,pdf_base64' },
          ],
        },
      ],
    })
  })

  it('maps streamed function calls into tool call events', async () => {
    const functionCall = {
      id: 'fc_1',
      type: 'function_call',
      call_id: 'call_1',
      name: 'lookup',
      arguments: '{"q":"x"}',
    }
    mockFetch([
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: { ...functionCall, arguments: '' },
        sequence_number: 1,
      },
      {
        type: 'response.function_call_arguments.delta',
        item_id: 'fc_1',
        output_index: 0,
        delta: '{"q"',
        sequence_number: 2,
      },
      {
        type: 'response.function_call_arguments.delta',
        item_id: 'fc_1',
        output_index: 0,
        delta: ':"x"}',
        sequence_number: 3,
      },
      {
        type: 'response.function_call_arguments.done',
        item_id: 'fc_1',
        output_index: 0,
        name: 'lookup',
        arguments: '{"q":"x"}',
        sequence_number: 4,
      },
      {
        type: 'response.completed',
        response: {
          status: 'completed',
          output: [functionCall],
        },
        sequence_number: 5,
      },
    ])
    const transport = createOpenAIResponsesTransport()

    const events = await collect(
      transport.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Use lookup' }] }],
        provider,
      }),
    )

    expect(events).toEqual([
      { type: StreamEventType.ToolCallStart, toolCall: { id: 'call_1', name: 'lookup' } },
      { type: StreamEventType.ToolCallDelta, toolCallId: 'call_1', arguments: '{"q"' },
      { type: StreamEventType.ToolCallDelta, toolCallId: 'call_1', arguments: ':"x"}' },
      { type: StreamEventType.ToolCallEnd, toolCallId: 'call_1' },
      { type: StreamEventType.Finish, finishReason: FinishReason.ToolCalls, usage: undefined },
    ])
  })

  it('formats resolved tool calls as function call output items', async () => {
    const fetchMock = mockFetch([
      {
        type: 'response.completed',
        response: { status: 'completed', output: [] },
        sequence_number: 1,
      },
    ])
    const transport = createOpenAIResponsesTransport()
    const tools: ToolDefinition[] = [
      {
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
      },
    ]
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'weather' }] },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_call',
            toolCall: { id: 'call_1', name: 'get_weather', arguments: '{"city":"Tokyo"}' },
            result: '{"condition":"sunny"}',
          },
        ],
      },
    ]

    await collect(transport.stream({ messages, tools, provider }))

    expect(getRequestBody(fetchMock)).toMatchObject({
      input: [
        { type: 'message', role: 'user', content: 'weather' },
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'get_weather',
          arguments: '{"city":"Tokyo"}',
        },
        {
          type: 'function_call_output',
          call_id: 'call_1',
          output: '{"condition":"sunny"}',
        },
      ],
      tools: [
        {
          type: 'function',
          name: 'get_weather',
          description: 'Get weather',
          parameters: { type: 'object', properties: {} },
          strict: false,
        },
      ],
    })
  })
})
