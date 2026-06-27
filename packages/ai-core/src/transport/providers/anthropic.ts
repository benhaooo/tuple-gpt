import type {
  Citation,
  NativeToolAction,
  NativeToolStatus,
  PipelineOutput,
  StreamEvent,
  Message,
  ToolDefinition,
} from '../../types'
import { Role, StreamEventType, FinishReason } from '../../types'
import type { Transport } from '../transport'
import { parseSSE } from '../sse-parser'

/**
 * Convert internal Message[] into Anthropic wire messages. Tool results
 * co-located on tool_call parts are emitted as a single follow-up user
 * message containing one tool_result content block per call — matching
 * Anthropic's "tool_result blocks live in a user message" convention.
 */
function formatMessages(messages: Message[]): { system?: string; messages: unknown[] } {
  let system: string | undefined
  const formatted: unknown[] = []

  for (const msg of messages) {
    if (msg.role === Role.System) {
      system = msg.content
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n')
      continue
    }

    const content: unknown[] = []
    const toolResults: unknown[] = []

    for (const part of msg.content) {
      switch (part.type) {
        case 'text':
          content.push({ type: 'text', text: part.text })
          break
        case 'image':
          content.push({
            type: 'image',
            source:
              part.image.startsWith('data:') || part.image.startsWith('http')
                ? { type: 'url', url: part.image }
                : { type: 'base64', media_type: part.mimeType ?? 'image/png', data: part.image },
          })
          break
        case 'tool_call':
          content.push({
            type: 'tool_use',
            id: part.toolCall.id,
            name: part.toolCall.name,
            input: JSON.parse(part.toolCall.arguments || '{}'),
          })
          if (part.result !== undefined) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: part.toolCall.id,
              content: part.result,
              is_error: part.isError,
            })
          }
          break
        case 'native_tool': {
          const raw = asRecord(part.nativeTool.raw)
          if (raw?.type) content.push(raw)
          break
        }
        case 'reasoning': {
          const raw = asRecord(part.reasoning.raw)
          if (raw?.type) content.push(raw)
          break
        }
      }
    }

    formatted.push({ role: msg.role, content })

    if (toolResults.length > 0) {
      formatted.push({ role: 'user', content: toolResults })
    }
  }

  return { system, messages: formatted }
}

function formatTools(tools: ToolDefinition[]): unknown[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }))
}

function formatWebSearchTool(): unknown {
  return {
    type: 'web_search_20250305',
    name: 'web_search',
  }
}

interface AnthropicContentBlockState {
  index: number
  id?: string
  type?: string
  name?: string
  toolInputJson?: string
  raw?: Record<string, unknown>
}

interface AnthropicNativeToolState {
  id: string
  status: NativeToolStatus
  action?: NativeToolAction
  sources?: Citation[]
  raw?: unknown
  started: boolean
  ended: boolean
}

interface AnthropicReasoningState {
  id?: string
  summary: string
  signature?: string
  raw?: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function mapNativeToolAction(value: unknown): NativeToolAction | undefined {
  const action = asRecord(value)
  if (!action) return undefined

  const type = asString(action.type) ?? 'search'
  const query = asString(action.query)
  const queries = Array.isArray(action.queries)
    ? action.queries.filter((item): item is string => typeof item === 'string')
    : undefined
  const url = asString(action.url)
  const pattern = asString(action.pattern)

  return {
    type,
    ...(query ? { query } : {}),
    ...(queries && queries.length > 0 ? { queries } : {}),
    ...(url ? { url } : {}),
    ...(pattern ? { pattern } : {}),
  }
}

function safeParseJsonObject(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined
  try {
    return asRecord(JSON.parse(value))
  } catch {
    return undefined
  }
}

function mapWebSearchSources(value: unknown): Citation[] {
  if (!Array.isArray(value)) return []

  const citations: Citation[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record) continue

    const url = asString(record.url)
    if (!url) continue

    citations.push({
      type: 'url',
      url,
      ...(asString(record.title) ? { title: asString(record.title) } : {}),
      ...(asString(record.page_age) ? { text: asString(record.page_age) } : {}),
      raw: record,
    })
  }

  return citations
}

function mapTextCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return []

  const citations: Citation[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record) continue

    const url = asString(record.url)
    if (!url) continue

    citations.push({
      type: 'url',
      url,
      ...(asString(record.title) ? { title: asString(record.title) } : {}),
      ...(asNumber(record.start_char_index) !== undefined
        ? { startIndex: asNumber(record.start_char_index) }
        : {}),
      ...(asNumber(record.end_char_index) !== undefined
        ? { endIndex: asNumber(record.end_char_index) }
        : {}),
      ...(asString(record.cited_text) ? { text: asString(record.cited_text) } : {}),
      raw: record,
    })
  }

  return citations
}

function mapStopReason(stopReason: string): FinishReason {
  switch (stopReason) {
    case 'tool_use':
      return FinishReason.ToolCalls
    case 'end_turn':
      return FinishReason.Stop
    case 'max_tokens':
      return FinishReason.Length
    default:
      return FinishReason.Stop
  }
}

export function createAnthropicTransport(): Transport {
  return {
    async *stream(request: PipelineOutput): AsyncIterable<StreamEvent> {
      const { messages, tools, provider, options } = request
      const baseUrl = provider.baseUrl ?? 'https://api.anthropic.com/v1'
      const { system, messages: formatted } = formatMessages(messages)

      const body: Record<string, unknown> = {
        model: provider.model,
        messages: formatted,
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      }

      if (system) body.system = system
      const formattedTools = formatTools(tools ?? [])
      if (provider.webSearch) formattedTools.push(formatWebSearchTool())
      if (formattedTools.length > 0) body.tools = formattedTools
      if (options?.temperature !== undefined) body.temperature = options.temperature
      if (options?.topP !== undefined) body.top_p = options.topP
      if (options?.stop) body.stop_sequences = options.stop

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          ...provider.headers,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        yield {
          type: StreamEventType.Error,
          error: new Error(`Anthropic API error ${response.status}: ${text}`),
        }
        return
      }

      if (!response.body) {
        yield { type: StreamEventType.Error, error: new Error('No response body') }
        return
      }

      let currentToolId = ''
      const blocks = new Map<number, AnthropicContentBlockState>()
      const nativeTools = new Map<string, AnthropicNativeToolState>()
      const reasoningByIndex = new Map<number, AnthropicReasoningState>()

      for await (const sse of parseSSE(response.body, options?.signal)) {
        let data: Record<string, unknown>
        try {
          data = JSON.parse(sse.data)
        } catch {
          continue
        }

        const eventType = sse.event ?? data.type

        switch (eventType) {
          case 'content_block_start': {
            const index = typeof data.index === 'number' ? data.index : blocks.size
            const block = data.content_block as Record<string, unknown>
            const blockState: AnthropicContentBlockState = {
              index,
              id: asString(block?.id),
              type: asString(block?.type),
              name: asString(block?.name),
              raw: block,
            }
            blocks.set(index, blockState)

            if (block?.type === 'tool_use') {
              currentToolId = block.id as string
              yield {
                type: StreamEventType.ToolCallStart,
                toolCall: { id: block.id as string, name: block.name as string },
              }
            } else if (block?.type === 'server_tool_use' && block.name === 'web_search') {
              const id = asString(block.id) ?? `anthropic_web_search_${index}`
              const action = mapNativeToolAction(block.input)
              const nativeTool: AnthropicNativeToolState = {
                id,
                status: 'in_progress',
                ...(action ? { action } : {}),
                raw: block,
                started: true,
                ended: false,
              }
              nativeTools.set(id, nativeTool)
              yield {
                type: StreamEventType.NativeToolStart,
                nativeTool: {
                  id,
                  provider: 'anthropic',
                  kind: 'web_search',
                  name: 'web_search',
                  status: nativeTool.status,
                  ...(action ? { action } : {}),
                  raw: block,
                },
              }
            } else if (block?.type === 'thinking') {
              const reasoning: AnthropicReasoningState = {
                ...(asString(block.id) ? { id: asString(block.id) } : {}),
                summary: asString(block.thinking) ?? '',
                raw: block,
              }
              reasoningByIndex.set(index, reasoning)
              if (reasoning.summary) {
                yield {
                  type: StreamEventType.ReasoningState,
                  reasoning: {
                    ...(reasoning.id ? { id: reasoning.id } : {}),
                    provider: 'anthropic',
                    summary: reasoning.summary,
                    raw: reasoning.raw,
                  },
                }
              }
            } else if (block?.type === 'web_search_tool_result') {
              const toolUseId = asString(block.tool_use_id) ?? asString(block.id)
              const id = toolUseId ?? `anthropic_web_search_${index}`
              const sources = mapWebSearchSources(block.content)
              const status: NativeToolStatus = block.is_error ? 'failed' : 'completed'
              const nativeTool =
                nativeTools.get(id) ??
                ({
                  id,
                  status,
                  started: false,
                  ended: false,
                } satisfies AnthropicNativeToolState)

              nativeTool.status = status
              nativeTool.sources = sources
              nativeTool.raw = block
              nativeTools.set(id, nativeTool)

              if (!nativeTool.started) {
                nativeTool.started = true
                yield {
                  type: StreamEventType.NativeToolStart,
                  nativeTool: {
                    id,
                    provider: 'anthropic',
                    kind: 'web_search',
                    name: 'web_search',
                    status: nativeTool.status,
                    ...(sources.length > 0 ? { sources } : {}),
                    raw: block,
                  },
                }
              }

              if (!nativeTool.ended) {
                nativeTool.ended = true
                yield {
                  type: StreamEventType.NativeToolEnd,
                  nativeToolId: id,
                  status: nativeTool.status,
                  ...(nativeTool.action ? { action: nativeTool.action } : {}),
                  ...(sources.length > 0 ? { sources } : {}),
                  raw: block,
                }
              }
            }
            break
          }

          case 'content_block_delta': {
            const index = typeof data.index === 'number' ? data.index : undefined
            const block = typeof index === 'number' ? blocks.get(index) : undefined
            const delta = data.delta as Record<string, unknown>
            if (delta?.type === 'text_delta') {
              yield { type: StreamEventType.TextDelta, text: delta.text as string }
              const citations = mapTextCitations(delta.citations)
              if (citations.length > 0) {
                yield { type: StreamEventType.TextAnnotations, citations }
              }
            } else if (delta?.type === 'citations_delta' || delta?.type === 'citation_delta') {
              const citations = mapTextCitations(
                delta.citations ?? (delta.citation ? [delta.citation] : undefined),
              )
              if (citations.length > 0) {
                yield { type: StreamEventType.TextAnnotations, citations }
              }
            } else if (delta?.type === 'input_json_delta') {
              const partialJson = asString(delta.partial_json) ?? ''
              if (block?.type === 'server_tool_use' && block.id) {
                block.toolInputJson = `${block.toolInputJson ?? ''}${partialJson}`
                const nativeTool = nativeTools.get(block.id)
                if (nativeTool) {
                  nativeTool.action =
                    mapNativeToolAction(safeParseJsonObject(block.toolInputJson)) ??
                    nativeTool.action
                  yield {
                    type: StreamEventType.NativeToolDelta,
                    nativeToolId: nativeTool.id,
                    status: nativeTool.status,
                    ...(nativeTool.action ? { action: nativeTool.action } : {}),
                    ...(nativeTool.raw ? { raw: nativeTool.raw } : {}),
                  }
                }
              } else {
                yield {
                  type: StreamEventType.ToolCallDelta,
                  toolCallId: currentToolId,
                  arguments: partialJson,
                }
              }
            } else if (delta?.type === 'thinking_delta') {
              if (typeof index !== 'number') break
              const reasoning =
                reasoningByIndex.get(index) ??
                ({
                  ...(block?.id ? { id: block.id } : {}),
                  summary: '',
                  raw: block?.raw,
                } satisfies AnthropicReasoningState)
              reasoning.summary += asString(delta.thinking) ?? ''
              reasoningByIndex.set(index, reasoning)
              yield {
                type: StreamEventType.ReasoningState,
                reasoning: {
                  ...(reasoning.id ? { id: reasoning.id } : {}),
                  provider: 'anthropic',
                  summary: reasoning.summary,
                  ...(reasoning.signature ? { encryptedContent: reasoning.signature } : {}),
                  raw: {
                    ...(reasoning.raw ?? {}),
                    thinking: reasoning.summary,
                    ...(reasoning.signature ? { signature: reasoning.signature } : {}),
                  },
                },
              }
            } else if (delta?.type === 'signature_delta') {
              if (typeof index !== 'number') break
              const reasoning =
                reasoningByIndex.get(index) ??
                ({
                  ...(block?.id ? { id: block.id } : {}),
                  summary: '',
                  raw: block?.raw,
                } satisfies AnthropicReasoningState)
              reasoning.signature = asString(delta.signature)
              reasoningByIndex.set(index, reasoning)
              yield {
                type: StreamEventType.ReasoningState,
                reasoning: {
                  ...(reasoning.id ? { id: reasoning.id } : {}),
                  provider: 'anthropic',
                  ...(reasoning.summary ? { summary: reasoning.summary } : {}),
                  ...(reasoning.signature ? { encryptedContent: reasoning.signature } : {}),
                  raw: {
                    ...(reasoning.raw ?? {}),
                    ...(reasoning.summary ? { thinking: reasoning.summary } : {}),
                    ...(reasoning.signature ? { signature: reasoning.signature } : {}),
                  },
                },
              }
            }
            break
          }

          case 'content_block_stop': {
            const index = typeof data.index === 'number' ? data.index : undefined
            const block = typeof index === 'number' ? blocks.get(index) : undefined
            if (block?.type === 'tool_use' && currentToolId) {
              yield { type: StreamEventType.ToolCallEnd, toolCallId: currentToolId }
              currentToolId = ''
            } else if (block?.type === 'server_tool_use' && block.id) {
              const nativeTool = nativeTools.get(block.id)
              if (nativeTool && !nativeTool.ended) {
                nativeTool.status = 'searching'
                yield {
                  type: StreamEventType.NativeToolDelta,
                  nativeToolId: nativeTool.id,
                  status: nativeTool.status,
                  ...(nativeTool.action ? { action: nativeTool.action } : {}),
                  ...(nativeTool.raw ? { raw: nativeTool.raw } : {}),
                }
              }
            }
            break
          }

          case 'message_stop':
            break

          case 'message_start': {
            break
          }

          case 'message_delta': {
            const delta = data.delta as Record<string, unknown>
            const stopReason = delta?.stop_reason as string | null
            const usage = data.usage as Record<string, number> | undefined
            if (stopReason) {
              yield {
                type: StreamEventType.Finish,
                finishReason: mapStopReason(stopReason),
                usage: usage
                  ? {
                      promptTokens: usage.input_tokens ?? 0,
                      completionTokens: usage.output_tokens ?? 0,
                      totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
                    }
                  : undefined,
              }
            }
            break
          }

          case 'error': {
            yield {
              type: StreamEventType.Error,
              error: new Error(`Anthropic stream error: ${JSON.stringify(data)}`),
            }
            break
          }
        }
      }
    },
  }
}
