import type {
  Citation,
  Message,
  NativeToolAction,
  NativeToolStatus,
  PipelineOutput,
  ReasoningContentPart,
  StreamEvent,
  ToolDefinition,
  Usage,
} from '../../types'
import { FinishReason, StreamEventType } from '../../types'
import type { Transport } from '../transport'
import { parseSSE } from '../sse-parser'

type ResponsesInputItem = Record<string, unknown>

interface ResponsesToolCallState {
  id: string
  name: string
  arguments: string
  started: boolean
  ended: boolean
}

interface ResponsesNativeToolState {
  id: string
  status: NativeToolStatus
  action?: NativeToolAction
  sources?: Citation[]
  raw?: unknown
  started: boolean
  ended: boolean
}

interface ResponsesReasoningState {
  id: string
  status: ReasoningContentPart['reasoning']['status']
  summary?: string
  encryptedContent?: string
  raw?: Record<string, unknown>
}

function formatInput(
  messages: Message[],
  previousOutputItems: ResponsesInputItem[] = [],
): ResponsesInputItem[] {
  const out: ResponsesInputItem[] = []
  const persistedRawOutputItemIds = collectRawOutputItemIds(messages)
  const previousFunctionCallIds = new Set(
    previousOutputItems
      .filter(item => item.type === 'function_call')
      .map(item => asString(item.call_id))
      .filter((id): id is string => !!id),
  )
  let previousOutputInserted = false

  for (const msg of messages) {
    const messageParts: unknown[] = []
    const functionItems: ResponsesInputItem[] = []

    for (const part of msg.content) {
      switch (part.type) {
        case 'text':
          messageParts.push({ type: 'input_text', text: part.text })
          break
        case 'image':
          messageParts.push(formatImagePart(part.image, part.mimeType))
          break
        case 'tool_call':
          if (previousFunctionCallIds.has(part.toolCall.id)) {
            if (!previousOutputInserted) {
              functionItems.push(
                ...previousOutputItems.filter(item => {
                  const id = asString(item.id)
                  return !id || !persistedRawOutputItemIds.has(id)
                }),
              )
              previousOutputInserted = true
            }
          } else {
            functionItems.push({
              type: 'function_call',
              call_id: part.toolCall.id,
              name: part.toolCall.name,
              arguments: part.toolCall.arguments,
            })
          }
          if (part.result !== undefined) {
            functionItems.push({
              type: 'function_call_output',
              call_id: part.toolCall.id,
              output: part.result,
            })
          }
          break
        case 'native_tool': {
          const raw = asRecord(part.nativeTool.raw)
          if (raw?.type) functionItems.push(raw)
          break
        }
        case 'reasoning': {
          const raw = asRecord(part.reasoning.raw)
          if (raw?.type) functionItems.push(raw)
          break
        }
      }
    }

    if (messageParts.length > 0) {
      out.push(formatMessage(msg.role, messageParts))
    }
    out.push(...functionItems)
  }

  return out
}

function collectRawOutputItemIds(messages: Message[]): Set<string> {
  const ids = new Set<string>()
  for (const message of messages) {
    for (const part of message.content) {
      if (part.type === 'native_tool') {
        const id = asString(asRecord(part.nativeTool.raw)?.id)
        if (id) ids.add(id)
      }
      if (part.type === 'reasoning') {
        const id = asString(asRecord(part.reasoning.raw)?.id)
        if (id) ids.add(id)
      }
    }
  }
  return ids
}

function formatMessage(role: Message['role'], parts: unknown[]): ResponsesInputItem {
  const text = getSingleTextPart(parts)
  return {
    type: 'message',
    role,
    content: text ?? parts,
  }
}

function getSingleTextPart(parts: unknown[]): string | undefined {
  if (parts.length !== 1) return undefined
  const part = parts[0]
  if (!part || typeof part !== 'object') return undefined
  const record = part as Record<string, unknown>
  return record.type === 'input_text' && typeof record.text === 'string' ? record.text : undefined
}

function formatImagePart(image: string, mimeType?: string): ResponsesInputItem {
  if (mimeType === 'application/pdf') {
    return { type: 'input_file', file_data: formatFileData(image, mimeType) }
  }

  return {
    type: 'input_image',
    image_url: formatImageUrl(image, mimeType),
  }
}

function formatImageUrl(image: string, mimeType?: string): string {
  if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }
  return mimeType ? `data:${mimeType};base64,${image}` : image
}

function formatFileData(file: string, mimeType: string): string {
  if (file.startsWith('data:')) return file
  return `data:${mimeType};base64,${file}`
}

function formatWebSearchTool(): unknown {
  return { type: 'web_search' }
}

function formatTools(tools: ToolDefinition[] = [], webSearch?: boolean): unknown[] {
  const formatted: unknown[] = tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: false,
  }))
  if (webSearch) formatted.push(formatWebSearchTool())
  return formatted
}

function mapUsage(usage: Record<string, unknown> | undefined): Usage | undefined {
  if (!usage) return undefined

  const promptTokens = asNumber(usage.input_tokens)
  const completionTokens = asNumber(usage.output_tokens)
  const totalTokens = asNumber(usage.total_tokens)
  if (promptTokens === undefined || completionTokens === undefined || totalTokens === undefined) {
    return undefined
  }

  return { promptTokens, completionTokens, totalTokens }
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function mapWebSearchStatus(status: unknown): NativeToolStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress'
    case 'searching':
      return 'searching'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

function mapWebSearchEventStatus(type: string): NativeToolStatus | undefined {
  switch (type) {
    case 'response.web_search_call.in_progress':
      return 'in_progress'
    case 'response.web_search_call.searching':
      return 'searching'
    case 'response.web_search_call.completed':
      return 'completed'
    default:
      return undefined
  }
}

function mapNativeToolAction(value: unknown): NativeToolAction | undefined {
  const action = asRecord(value)
  if (!action) return undefined

  const type = asString(action.type)
  if (!type) return undefined

  const queries = Array.isArray(action.queries)
    ? action.queries.filter((query): query is string => typeof query === 'string')
    : undefined

  return {
    type,
    ...(asString(action.query) ? { query: asString(action.query) } : {}),
    ...(queries && queries.length > 0 ? { queries } : {}),
    ...(asString(action.url) ? { url: asString(action.url) } : {}),
    ...(asString(action.pattern) ? { pattern: asString(action.pattern) } : {}),
  }
}

function mapAnnotationsToCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return []

  const citations: Citation[] = []
  for (const annotation of value) {
    const record = asRecord(annotation)
    if (!record) continue

    const url = asString(record.url)
    if (!url) continue

    const title = asString(record.title)
    const startIndex = asNumber(record.start_index)
    const endIndex = asNumber(record.end_index)
    const text = asString(record.text)
    citations.push({
      type: 'url',
      url,
      ...(title ? { title } : {}),
      ...(startIndex !== undefined ? { startIndex } : {}),
      ...(endIndex !== undefined ? { endIndex } : {}),
      ...(text ? { text } : {}),
      raw: record,
    })
  }

  return citations
}

function mapReasoningItem(
  item: Record<string, unknown>,
  status: ReasoningContentPart['reasoning']['status'],
  id: string,
): ReasoningContentPart['reasoning'] | undefined {
  if (item.type !== 'reasoning') return undefined

  const summary = extractReasoningSummary(item.summary)

  return {
    id,
    provider: 'openai-responses',
    status,
    ...(summary ? { summary } : {}),
    ...(asString(item.encrypted_content)
      ? { encryptedContent: asString(item.encrypted_content) }
      : {}),
    raw: item,
  }
}

function extractReasoningSummary(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value
  if (!Array.isArray(value)) return undefined

  const text = value
    .map(item => {
      if (typeof item === 'string') return item
      const record = asRecord(item)
      return asString(record?.text) ?? asString(record?.summary)
    })
    .filter((item): item is string => !!item)
    .join('\n')

  return text || undefined
}

function fallbackToolCallId(outputIndex: unknown, itemId: unknown): string {
  const id = asString(itemId)
  if (id) return id
  return typeof outputIndex === 'number' ? `response_tool_${outputIndex}` : 'response_tool'
}

function responseReasoningId(
  itemId: string | undefined,
  outputIndex: unknown,
  fallbackIndex: number,
): string {
  if (itemId) return `openai-responses:${itemId}`
  return typeof outputIndex === 'number'
    ? `openai-responses:output:${outputIndex}`
    : `openai-responses:output:${fallbackIndex}`
}

function getResponseErrorMessage(response: Record<string, unknown> | undefined): string {
  const error = asRecord(response?.error)
  return asString(error?.message) ?? 'OpenAI Responses API error'
}

export function createOpenAIResponsesTransport(): Transport {
  let previousOutputItemsForNextRequest: ResponsesInputItem[] = []

  return {
    async *stream(request: PipelineOutput): AsyncIterable<StreamEvent> {
      const { messages, tools, provider, options } = request
      const baseUrl = provider.baseUrl ?? 'https://api.openai.com/v1'
      const toolCallsByItemId = new Map<string, ResponsesToolCallState>()
      const toolCallsByOutputIndex = new Map<number, ResponsesToolCallState>()
      const webSearchByItemId = new Map<string, ResponsesNativeToolState>()
      const webSearchByOutputIndex = new Map<number, ResponsesNativeToolState>()
      const reasoningByItemId = new Map<string, ResponsesReasoningState>()
      const reasoningByOutputIndex = new Map<number, ResponsesReasoningState>()
      const emittedCitationKeys = new Set<string>()
      const emittedReasoningItemIds = new Set<string>()
      let sawToolCall = false
      let sawNativeTool = false
      let sawReasoning = false
      let emittedFinish = false

      const body: Record<string, unknown> = {
        model: provider.model,
        input: formatInput(messages, previousOutputItemsForNextRequest),
        stream: true,
        store: false,
        include: ['reasoning.encrypted_content'],
      }
      if (provider.reasoning !== false) {
        body.reasoning = { summary: 'auto' }
      }
      previousOutputItemsForNextRequest = []

      const formattedTools = formatTools(tools, provider.webSearch)
      if (formattedTools.length > 0) body.tools = formattedTools
      if (options?.temperature !== undefined) body.temperature = options.temperature
      if (options?.maxTokens !== undefined) body.max_output_tokens = options.maxTokens
      if (options?.topP !== undefined) body.top_p = options.topP

      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
          ...provider.headers,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        yield {
          type: StreamEventType.Error,
          error: new Error(`OpenAI Responses API error ${response.status}: ${text}`),
        }
        return
      }

      if (!response.body) {
        yield { type: StreamEventType.Error, error: new Error('No response body') }
        return
      }

      const getToolCall = (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
      ): ResponsesToolCallState | undefined => {
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const outputIndex = event.output_index
        if (itemId && toolCallsByItemId.has(itemId)) return toolCallsByItemId.get(itemId)
        if (typeof outputIndex === 'number' && toolCallsByOutputIndex.has(outputIndex)) {
          return toolCallsByOutputIndex.get(outputIndex)
        }
        return undefined
      }

      const getWebSearch = (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
      ): ResponsesNativeToolState | undefined => {
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const outputIndex = event.output_index
        if (itemId && webSearchByItemId.has(itemId)) return webSearchByItemId.get(itemId)
        if (typeof outputIndex === 'number' && webSearchByOutputIndex.has(outputIndex)) {
          return webSearchByOutputIndex.get(outputIndex)
        }
        return undefined
      }

      const getReasoning = (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
      ): ResponsesReasoningState | undefined => {
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const outputIndex = event.output_index
        if (itemId && reasoningByItemId.has(itemId)) return reasoningByItemId.get(itemId)
        if (typeof outputIndex === 'number' && reasoningByOutputIndex.has(outputIndex)) {
          return reasoningByOutputIndex.get(outputIndex)
        }
        return undefined
      }

      const ensureToolCall = function* (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
      ): Generator<StreamEvent, ResponsesToolCallState | undefined> {
        const type = asString(item?.type)
        const existing = getToolCall(event, item)
        const name = asString(item?.name) ?? asString(event.name) ?? existing?.name

        if (existing) {
          if (!existing.started && name) {
            existing.started = true
            yield {
              type: StreamEventType.ToolCallStart,
              toolCall: { id: existing.id, name: existing.name },
            }
          }
          return existing
        }

        if (type && type !== 'function_call') return undefined
        if (!name) return undefined

        const outputIndex = event.output_index
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const id = asString(item?.call_id) ?? fallbackToolCallId(outputIndex, itemId)
        const toolCall: ResponsesToolCallState = {
          id,
          name,
          arguments: '',
          started: true,
          ended: false,
        }
        sawToolCall = true

        if (itemId) toolCallsByItemId.set(itemId, toolCall)
        if (typeof outputIndex === 'number') toolCallsByOutputIndex.set(outputIndex, toolCall)

        yield { type: StreamEventType.ToolCallStart, toolCall: { id, name } }
        return toolCall
      }

      const ensureWebSearch = function* (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
        statusHint?: NativeToolStatus,
      ): Generator<StreamEvent, ResponsesNativeToolState | undefined> {
        const existing = getWebSearch(event, item)
        const status = statusHint ?? mapWebSearchStatus(item?.status)
        const action = mapNativeToolAction(item?.action)

        if (existing) {
          existing.status = status
          if (action) existing.action = action
          if (item) existing.raw = item
          if (!existing.started) {
            existing.started = true
            yield {
              type: StreamEventType.NativeToolStart,
              nativeTool: {
                id: existing.id,
                provider: 'openai-responses',
                kind: 'web_search',
                name: 'web_search',
                status: existing.status,
                ...(existing.action ? { action: existing.action } : {}),
                ...(existing.sources ? { sources: existing.sources } : {}),
                ...(existing.raw ? { raw: existing.raw } : {}),
              },
            }
          }
          return existing
        }

        if (item?.type && item.type !== 'web_search_call') return undefined

        const outputIndex = event.output_index
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const id =
          itemId ??
          (typeof outputIndex === 'number'
            ? `response_web_search_${outputIndex}`
            : 'response_web_search')
        const nativeTool: ResponsesNativeToolState = {
          id,
          status,
          ...(action ? { action } : {}),
          ...(item ? { raw: item } : {}),
          started: true,
          ended: false,
        }
        sawNativeTool = true

        if (itemId) webSearchByItemId.set(itemId, nativeTool)
        if (typeof outputIndex === 'number') webSearchByOutputIndex.set(outputIndex, nativeTool)

        yield {
          type: StreamEventType.NativeToolStart,
          nativeTool: {
            id,
            provider: 'openai-responses',
            kind: 'web_search',
            name: 'web_search',
            status,
            ...(action ? { action } : {}),
            ...(item ? { raw: item } : {}),
          },
        }
        return nativeTool
      }

      const appendToolCallArguments = function* (
        toolCall: ResponsesToolCallState,
        nextArguments: string,
      ): Generator<StreamEvent> {
        if (!nextArguments) return

        if (nextArguments.startsWith(toolCall.arguments)) {
          const delta = nextArguments.slice(toolCall.arguments.length)
          if (delta) {
            toolCall.arguments = nextArguments
            yield {
              type: StreamEventType.ToolCallDelta,
              toolCallId: toolCall.id,
              arguments: delta,
            }
          }
          return
        }

        toolCall.arguments = nextArguments
        yield {
          type: StreamEventType.ToolCallDelta,
          toolCallId: toolCall.id,
          arguments: nextArguments,
        }
      }

      const emitWebSearchDelta = function* (
        nativeTool: ResponsesNativeToolState,
      ): Generator<StreamEvent> {
        yield {
          type: StreamEventType.NativeToolDelta,
          nativeToolId: nativeTool.id,
          status: nativeTool.status,
          ...(nativeTool.action ? { action: nativeTool.action } : {}),
          ...(nativeTool.sources ? { sources: nativeTool.sources } : {}),
          ...(nativeTool.raw ? { raw: nativeTool.raw } : {}),
        }
      }

      const finishWebSearch = function* (
        nativeTool: ResponsesNativeToolState,
      ): Generator<StreamEvent> {
        if (nativeTool.ended) return
        nativeTool.ended = true
        yield {
          type: StreamEventType.NativeToolEnd,
          nativeToolId: nativeTool.id,
          status: nativeTool.status,
          ...(nativeTool.action ? { action: nativeTool.action } : {}),
          ...(nativeTool.sources ? { sources: nativeTool.sources } : {}),
          ...(nativeTool.raw ? { raw: nativeTool.raw } : {}),
        }
      }

      const finishToolCall = function* (toolCall: ResponsesToolCallState): Generator<StreamEvent> {
        if (toolCall.ended) return
        toolCall.ended = true
        yield { type: StreamEventType.ToolCallEnd, toolCallId: toolCall.id }
      }

      const handleFunctionCallItem = function* (
        event: Record<string, unknown>,
        item: Record<string, unknown>,
        finish = false,
      ): Generator<StreamEvent> {
        if (item.type !== 'function_call') return

        const toolCall = yield* ensureToolCall(event, item)
        if (!toolCall) return

        const args = asString(item.arguments)
        if (args !== undefined) {
          yield* appendToolCallArguments(toolCall, args)
        }
        if (finish) {
          yield* finishToolCall(toolCall)
        }
      }

      const handleWebSearchItem = function* (
        event: Record<string, unknown>,
        item: Record<string, unknown>,
        finish = false,
      ): Generator<StreamEvent> {
        if (item.type !== 'web_search_call') return

        const nativeTool = yield* ensureWebSearch(event, item)
        if (!nativeTool) return

        nativeTool.status = mapWebSearchStatus(item.status)
        nativeTool.action = mapNativeToolAction(item.action) ?? nativeTool.action
        nativeTool.raw = item

        if (finish) {
          yield* finishWebSearch(nativeTool)
        }
      }

      const handleWebSearchStatusEvent = function* (
        event: Record<string, unknown>,
        type: string,
      ): Generator<StreamEvent> {
        const status = mapWebSearchEventStatus(type)
        if (!status) return

        const nativeTool = yield* ensureWebSearch(event, undefined, status)
        if (!nativeTool) return
        nativeTool.status = status
        yield* emitWebSearchDelta(nativeTool)
      }

      const emitReasoningState = function* (
        reasoning: ResponsesReasoningState,
      ): Generator<StreamEvent> {
        sawReasoning = true
        yield {
          type: StreamEventType.ReasoningState,
          reasoning: {
            id: reasoning.id,
            provider: 'openai-responses',
            status: reasoning.status,
            ...(reasoning.summary ? { summary: reasoning.summary } : {}),
            ...(reasoning.encryptedContent ? { encryptedContent: reasoning.encryptedContent } : {}),
            ...(reasoning.raw ? { raw: reasoning.raw } : {}),
          },
        }
      }

      const ensureReasoning = function* (
        event: Record<string, unknown>,
        item?: Record<string, unknown>,
        status: ReasoningContentPart['reasoning']['status'] = 'in_progress',
        emit = true,
      ): Generator<StreamEvent, ResponsesReasoningState | undefined> {
        if (item?.type && item.type !== 'reasoning') return undefined

        const outputIndex = event.output_index
        const itemId = asString(item?.id) ?? asString(event.item_id)
        const id = responseReasoningId(
          itemId,
          outputIndex,
          reasoningByItemId.size + reasoningByOutputIndex.size,
        )
        const existing = getReasoning(event, item)
        const mapped = item
          ? mapReasoningItem(item, status, id)
          : {
              id,
              provider: 'openai-responses',
              status,
            }

        if (!mapped) return undefined

        const reasoning =
          existing ??
          ({
            id: mapped.id,
            status: mapped.status,
          } satisfies ResponsesReasoningState)
        reasoning.status = mapped.status
        if (mapped.summary !== undefined) reasoning.summary = mapped.summary
        if (mapped.encryptedContent !== undefined) {
          reasoning.encryptedContent = mapped.encryptedContent
        }
        if (mapped.raw !== undefined) reasoning.raw = asRecord(mapped.raw)

        if (itemId) reasoningByItemId.set(itemId, reasoning)
        if (typeof outputIndex === 'number') reasoningByOutputIndex.set(outputIndex, reasoning)

        if (emit) yield* emitReasoningState(reasoning)
        return reasoning
      }

      const appendReasoningSummaryDelta = function* (
        event: Record<string, unknown>,
      ): Generator<StreamEvent> {
        const reasoning = yield* ensureReasoning(event, undefined, 'in_progress', false)
        if (!reasoning) return
        const delta =
          asString(event.delta) ??
          asString(event.text) ??
          asString(asRecord(event.summary)?.text) ??
          ''
        if (!delta) return
        reasoning.summary = `${reasoning.summary ?? ''}${delta}`
        reasoning.status = 'in_progress'
        yield* emitReasoningState(reasoning)
      }

      const emitCitations = function* (citations: Citation[]): Generator<StreamEvent> {
        const next = citations.filter(citation => {
          const key = `${citation.url}:${citation.startIndex ?? ''}:${citation.endIndex ?? ''}:${
            citation.title ?? ''
          }`
          if (emittedCitationKeys.has(key)) return false
          emittedCitationKeys.add(key)
          return true
        })

        if (next.length > 0) {
          yield { type: StreamEventType.TextAnnotations, citations: next }
        }
      }

      const emitReasoning = function* (
        event: Record<string, unknown>,
        item: Record<string, unknown>,
        status: ReasoningContentPart['reasoning']['status'] = 'completed',
      ): Generator<StreamEvent> {
        if (item.type !== 'reasoning') return

        const outputIndex = event.output_index
        const id = responseReasoningId(asString(item.id), outputIndex, emittedReasoningItemIds.size)
        if (status === 'completed') {
          if (emittedReasoningItemIds.has(id)) return
          emittedReasoningItemIds.add(id)
        }
        yield* ensureReasoning(event, item, status)
      }

      const handleCompletedResponse = function* (
        event: Record<string, unknown>,
      ): Generator<StreamEvent> {
        const responseRecord = asRecord(event.response)
        const output = Array.isArray(responseRecord?.output) ? responseRecord.output : []
        const reusableOutputItems: ResponsesInputItem[] = []

        for (let i = 0; i < output.length; i++) {
          const item = asRecord(output[i])
          if (!item) continue
          if (
            item.type === 'reasoning' ||
            item.type === 'function_call' ||
            item.type === 'web_search_call'
          ) {
            reusableOutputItems.push(item)
          }
          yield* handleFunctionCallItem({ output_index: i }, item, true)
          yield* handleWebSearchItem({ output_index: i }, item, true)
          yield* emitReasoning({ output_index: i }, item)

          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const part of item.content) {
              const citations = mapAnnotationsToCitations(asRecord(part)?.annotations)
              yield* emitCitations(citations)
            }
          }
        }
        previousOutputItemsForNextRequest =
          sawToolCall || sawNativeTool || sawReasoning ? reusableOutputItems : []

        const status = asString(responseRecord?.status)
        const incompleteReason = asString(asRecord(responseRecord?.incomplete_details)?.reason)
        emittedFinish = true
        yield {
          type: StreamEventType.Finish,
          finishReason:
            sawToolCall || toolCallsByItemId.size > 0 || toolCallsByOutputIndex.size > 0
              ? FinishReason.ToolCalls
              : status === 'incomplete' || incompleteReason === 'max_output_tokens'
                ? FinishReason.Length
                : FinishReason.Stop,
          usage: mapUsage(asRecord(responseRecord?.usage)),
        }
      }

      for await (const sse of parseSSE(response.body, options?.signal)) {
        if (sse.data === '[DONE]') {
          break
        }

        let event: Record<string, unknown>
        try {
          event = JSON.parse(sse.data)
        } catch {
          continue
        }

        const type = asString(event.type) ?? sse.event

        switch (type) {
          case 'response.output_text.delta': {
            const delta = asString(event.delta)
            if (delta) yield { type: StreamEventType.TextDelta, text: delta }
            break
          }
          case 'response.output_item.added': {
            const item = asRecord(event.item)
            if (item) {
              yield* handleFunctionCallItem(event, item)
              yield* handleWebSearchItem(event, item)
              yield* emitReasoning(event, item, 'in_progress')
            }
            break
          }
          case 'response.reasoning_summary_text.delta':
          case 'response.reasoning_summary.delta':
            yield* appendReasoningSummaryDelta(event)
            break
          case 'response.reasoning_summary_text.done':
          case 'response.reasoning_summary.done': {
            const reasoning = yield* ensureReasoning(event, undefined, 'in_progress', false)
            if (!reasoning) break
            const text = asString(event.text) ?? extractReasoningSummary(event.summary)
            if (text !== undefined) reasoning.summary = text
            reasoning.status = 'in_progress'
            yield* emitReasoningState(reasoning)
            break
          }
          case 'response.output_item.done': {
            const item = asRecord(event.item)
            if (item) {
              yield* handleFunctionCallItem(event, item, true)
              yield* handleWebSearchItem(event, item, true)
              yield* emitReasoning(event, item)
            }
            break
          }
          case 'response.web_search_call.in_progress':
          case 'response.web_search_call.searching':
          case 'response.web_search_call.completed':
            yield* handleWebSearchStatusEvent(event, type)
            break
          case 'response.output_text.done':
            yield* emitCitations(mapAnnotationsToCitations(event.annotations))
            break
          case 'response.content_part.done': {
            const part = asRecord(event.part)
            yield* emitCitations(mapAnnotationsToCitations(part?.annotations))
            break
          }
          case 'response.function_call_arguments.delta': {
            const toolCall = getToolCall(event)
            const delta = asString(event.delta)
            if (toolCall && delta) {
              toolCall.arguments += delta
              yield {
                type: StreamEventType.ToolCallDelta,
                toolCallId: toolCall.id,
                arguments: delta,
              }
            }
            break
          }
          case 'response.function_call_arguments.done': {
            const toolCall = yield* ensureToolCall(event)
            if (!toolCall) break
            const args = asString(event.arguments)
            if (args !== undefined) {
              yield* appendToolCallArguments(toolCall, args)
            }
            yield* finishToolCall(toolCall)
            break
          }
          case 'response.completed':
            yield* handleCompletedResponse(event)
            break
          case 'response.incomplete':
            emittedFinish = true
            yield { type: StreamEventType.Finish, finishReason: FinishReason.Length }
            break
          case 'response.failed': {
            emittedFinish = true
            yield {
              type: StreamEventType.Error,
              error: new Error(getResponseErrorMessage(asRecord(event.response))),
            }
            break
          }
          case 'error': {
            emittedFinish = true
            yield {
              type: StreamEventType.Error,
              error: new Error(asString(event.message) ?? 'OpenAI Responses API error'),
            }
            break
          }
        }
      }

      if (!emittedFinish) {
        yield {
          type: StreamEventType.Finish,
          finishReason:
            sawToolCall || toolCallsByItemId.size > 0 || toolCallsByOutputIndex.size > 0
              ? FinishReason.ToolCalls
              : FinishReason.Stop,
        }
      }
    },
  }
}
