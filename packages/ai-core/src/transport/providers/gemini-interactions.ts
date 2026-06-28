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
import { FinishReason, Role, StreamEventType } from '../../types'
import type { Transport } from '../transport'
import { parseSSE } from '../sse-parser'

type InteractionInputItem = Record<string, unknown>

interface GeminiInteractionStepState {
  id: string
  type: string
  status?: NativeToolStatus
  action?: NativeToolAction
  sources?: Citation[]
  raw?: Record<string, unknown>
  started: boolean
  ended: boolean
}

interface GeminiReasoningState {
  id: string
  status: ReasoningContentPart['reasoning']['status']
  summary?: string
  encryptedContent?: string
  raw?: Record<string, unknown>
}

function formatInput(messages: Message[]): InteractionInputItem[] {
  const input: InteractionInputItem[] = []

  for (const message of messages) {
    const content: unknown[] = []

    for (const part of message.content) {
      switch (part.type) {
        case 'text':
          content.push({ type: 'text', text: part.text })
          break
        case 'image':
          content.push(formatImagePart(part.image, part.mimeType))
          break
        case 'tool_call':
          content.push({
            type: 'function_call',
            id: part.toolCall.id,
            name: part.toolCall.name,
            arguments: safeParseJsonObject(part.toolCall.arguments) ?? {},
          })
          if (part.result !== undefined) {
            content.push({
              type: 'function_response',
              id: part.toolCall.id,
              name: part.toolCall.name,
              response: { result: part.result, is_error: part.isError },
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

    if (content.length > 0) {
      input.push({
        type: 'message',
        role: message.role === Role.Assistant ? 'model' : message.role,
        content: content.length === 1 ? content[0] : content,
      })
    }
  }

  return input
}

function formatImagePart(image: string, mimeType?: string): InteractionInputItem {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return { type: 'file', file_uri: image, mime_type: mimeType ?? 'image/png' }
  }

  const data = image.startsWith('data:') ? image : `data:${mimeType ?? 'image/png'};base64,${image}`
  return { type: 'inline_data', data, mime_type: mimeType ?? 'image/png' }
}

function formatTools(tools: ToolDefinition[] = [], webSearch?: boolean): unknown[] {
  const formatted: unknown[] = tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }))

  if (webSearch) formatted.push({ type: 'google_search' })
  return formatted
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

function safeParseJsonObject(value: string): Record<string, unknown> | undefined {
  try {
    return asRecord(JSON.parse(value || '{}'))
  } catch {
    return undefined
  }
}

function mapUsage(value: unknown): Usage | undefined {
  const usage = asRecord(value)
  if (!usage) return undefined

  const promptTokens = asNumber(usage.prompt_token_count ?? usage.promptTokenCount)
  const completionTokens = asNumber(
    usage.candidates_token_count ?? usage.candidatesTokenCount ?? usage.output_token_count,
  )
  const totalTokens = asNumber(usage.total_token_count ?? usage.totalTokenCount)

  if (promptTokens === undefined || completionTokens === undefined || totalTokens === undefined) {
    return undefined
  }

  return { promptTokens, completionTokens, totalTokens }
}

function mapNativeToolStatus(value: unknown): NativeToolStatus {
  switch (value) {
    case 'pending':
    case 'PENDING':
      return 'pending'
    case 'running':
    case 'in_progress':
    case 'IN_PROGRESS':
      return 'in_progress'
    case 'searching':
    case 'SEARCHING':
      return 'searching'
    case 'failed':
    case 'FAILED':
    case 'error':
    case 'ERROR':
      return 'failed'
    case 'completed':
    case 'COMPLETE':
    case 'COMPLETED':
    case 'succeeded':
      return 'completed'
    default:
      return 'in_progress'
  }
}

function mapNativeToolAction(value: unknown): NativeToolAction | undefined {
  const action = asRecord(value)
  if (!action) return undefined

  const type = asString(action.type)
  if (type === 'google_search_result') return undefined

  const args = asRecord(action.arguments) ?? asRecord(action.args) ?? action
  const query = asString(args.query)
  const queries = Array.isArray(args.queries)
    ? args.queries.filter((item): item is string => typeof item === 'string')
    : undefined
  const url = asString(args.url)
  const pattern = asString(args.pattern)

  return {
    type: type ?? 'search',
    ...(query ? { query } : {}),
    ...(queries && queries.length > 0 ? { queries } : {}),
    ...(url ? { url } : {}),
    ...(pattern ? { pattern } : {}),
  }
}

function mapCitationsFromAnnotations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return []

  const citations: Citation[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record) continue

    const url = asString(record.url) ?? asString(asRecord(record.source)?.url)
    if (!url) continue

    citations.push({
      type: 'url',
      url,
      ...(asString(record.title) ? { title: asString(record.title) } : {}),
      ...(asNumber(record.start_index ?? record.startIndex) !== undefined
        ? { startIndex: asNumber(record.start_index ?? record.startIndex) }
        : {}),
      ...(asNumber(record.end_index ?? record.endIndex) !== undefined
        ? { endIndex: asNumber(record.end_index ?? record.endIndex) }
        : {}),
      ...(asString(record.text) ? { text: asString(record.text) } : {}),
      raw: record,
    })
  }

  return citations
}

function mapCitationsFromGroundingMetadata(value: unknown): Citation[] {
  const metadata = asRecord(value)
  if (!metadata) return []

  const chunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : []
  const supports = Array.isArray(metadata.groundingSupports) ? metadata.groundingSupports : []
  const citations: Citation[] = []

  for (const support of supports) {
    const supportRecord = asRecord(support)
    if (!supportRecord) continue

    const segment = asRecord(supportRecord.segment)
    const indices = Array.isArray(supportRecord.groundingChunkIndices)
      ? supportRecord.groundingChunkIndices
      : []

    for (const index of indices) {
      if (typeof index !== 'number') continue
      const chunk = asRecord(chunks[index])
      const web = asRecord(chunk?.web)
      const url = asString(web?.uri)
      if (!url) continue

      citations.push({
        type: 'url',
        url,
        ...(asString(web?.title) ? { title: asString(web?.title) } : {}),
        ...(asNumber(segment?.startIndex) !== undefined
          ? { startIndex: asNumber(segment?.startIndex) }
          : {}),
        ...(asNumber(segment?.endIndex) !== undefined
          ? { endIndex: asNumber(segment?.endIndex) }
          : {}),
        ...(asString(segment?.text) ? { text: asString(segment?.text) } : {}),
        raw: { chunk, support: supportRecord },
      })
    }
  }

  if (citations.length > 0) return citations

  for (const chunk of chunks) {
    const chunkRecord = asRecord(chunk)
    const web = asRecord(chunkRecord?.web)
    const url = asString(web?.uri)
    if (!url) continue

    citations.push({
      type: 'url',
      url,
      ...(asString(web?.title) ? { title: asString(web?.title) } : {}),
      raw: chunkRecord,
    })
  }

  return citations
}

function mapSourcesFromStep(step: Record<string, unknown>): Citation[] {
  return [
    ...mapCitationsFromAnnotations(step.annotations),
    ...mapCitationsFromGroundingMetadata(step.groundingMetadata ?? step.grounding_metadata),
    ...mapCitationsFromGroundingMetadata(step.result),
  ]
}

function stepType(value: Record<string, unknown>): string | undefined {
  return asString(value.type) ?? asString(value.kind) ?? asString(value.step_type)
}

function isGoogleSearchStep(value: Record<string, unknown>): boolean {
  const type = stepType(value)
  return type === 'google_search_call' || type === 'google_search_result'
}

function isReasoningStep(value: Record<string, unknown>): boolean {
  const type = stepType(value)
  return type === 'thought' || type === 'thinking' || type === 'reasoning'
}

function isModelOutputStep(value: Record<string, unknown>): boolean {
  const type = stepType(value)
  return type === 'model_output' || type === 'message' || type === 'output_text'
}

function extractText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  const record = asRecord(value)
  if (!record) return undefined

  if (asString(record.text)) return asString(record.text)
  if (asString(record.output_text)) return asString(record.output_text)

  const content = record.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return undefined

  return content
    .map(item => {
      if (typeof item === 'string') return item
      const part = asRecord(item)
      return asString(part?.text) ?? asString(part?.output_text)
    })
    .filter((item): item is string => !!item)
    .join('')
}

function mapReasoning(
  step: Record<string, unknown>,
  status: ReasoningContentPart['reasoning']['status'],
  id: string,
): ReasoningContentPart['reasoning'] {
  const summary = extractText(step.summary) ?? extractText(step.thought) ?? extractText(step)
  const signature = asString(step.signature) ?? asString(step.thought_signature)

  return {
    id,
    provider: 'gemini-interactions',
    status,
    ...(summary ? { summary } : {}),
    ...(signature ? { encryptedContent: signature } : {}),
    raw: step,
  }
}

function eventPayload(data: Record<string, unknown>): Record<string, unknown> | undefined {
  return (
    asRecord(data.step) ??
    asRecord(data.delta) ??
    asRecord(data.item) ??
    asRecord(data.output) ??
    asRecord(data)
  )
}

function geminiReasoningId(interactionId: string | undefined, index: number): string {
  return `gemini-interactions:${interactionId ?? 'interaction'}:${index}`
}

export function createGeminiInteractionsTransport(): Transport {
  return {
    async *stream(request: PipelineOutput): AsyncIterable<StreamEvent> {
      const { messages, tools, provider, options } = request
      const baseUrl = provider.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
      const stepStates = new Map<string, GeminiInteractionStepState>()
      const reasoningStates = new Map<string, GeminiReasoningState>()
      const reasoningIdsByIndex = new Map<number, string>()
      const emittedSourceKeys = new Set<string>()
      let interactionId: string | undefined
      let sawToolCall = false
      let emittedFinish = false

      const body: Record<string, unknown> = {
        model: provider.model,
        input: formatInput(messages),
        stream: true,
      }

      const formattedTools = formatTools(tools, provider.webSearch)
      if (formattedTools.length > 0) body.tools = formattedTools

      const generationConfig: Record<string, unknown> = {}
      if (options?.temperature !== undefined) generationConfig.temperature = options.temperature
      if (options?.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens
      if (options?.topP !== undefined) generationConfig.topP = options.topP
      if (options?.stop) generationConfig.stopSequences = options.stop
      if (provider.reasoning !== false) generationConfig.thinking_summaries = 'auto'
      if (Object.keys(generationConfig).length > 0) body.generation_config = generationConfig

      const response = await fetch(`${baseUrl}/interactions?key=${provider.apiKey}&alt=sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...provider.headers,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        yield {
          type: StreamEventType.Error,
          error: new Error(`Gemini Interactions API error ${response.status}: ${text}`),
        }
        return
      }

      if (!response.body) {
        yield { type: StreamEventType.Error, error: new Error('No response body') }
        return
      }

      const emitSources = function* (citations: Citation[]): Generator<StreamEvent> {
        const next = citations.filter(citation => {
          const key = `${citation.url}:${citation.startIndex ?? ''}:${citation.endIndex ?? ''}`
          if (emittedSourceKeys.has(key)) return false
          emittedSourceKeys.add(key)
          return true
        })
        if (next.length > 0) {
          yield { type: StreamEventType.TextAnnotations, citations: next }
        }
      }

      const ensureNativeTool = function* (
        step: Record<string, unknown>,
      ): Generator<StreamEvent, GeminiInteractionStepState> {
        const id =
          asString(step.id) ?? asString(step.step_id) ?? `gemini_google_search_${stepStates.size}`
        const existing = stepStates.get(id)
        const action = mapNativeToolAction(step)
        const sources = mapSourcesFromStep(step)
        const status =
          stepType(step) === 'google_search_result' ? 'completed' : mapNativeToolStatus(step.status)

        if (existing) {
          existing.status = status
          if (action) existing.action = action
          if (sources.length > 0) existing.sources = sources
          existing.raw = { ...(existing.raw ?? {}), ...step }
          return existing
        }

        const state: GeminiInteractionStepState = {
          id,
          type: 'google_search',
          status,
          ...(action ? { action } : {}),
          ...(sources.length > 0 ? { sources } : {}),
          raw: step,
          started: true,
          ended: false,
        }
        stepStates.set(id, state)

        yield {
          type: StreamEventType.NativeToolStart,
          nativeTool: {
            id,
            provider: 'gemini-interactions',
            kind: 'web_search',
            name: 'google_search',
            status,
            ...(state.action ? { action: state.action } : {}),
            ...(state.sources ? { sources: state.sources } : {}),
            raw: step,
          },
        }

        return state
      }

      const emitNativeToolUpdate = function* (
        state: GeminiInteractionStepState,
        finish = false,
      ): Generator<StreamEvent> {
        if (finish && !state.ended) {
          state.ended = true
          yield {
            type: StreamEventType.NativeToolEnd,
            nativeToolId: state.id,
            status: state.status ?? 'completed',
            ...(state.action ? { action: state.action } : {}),
            ...(state.sources ? { sources: state.sources } : {}),
            ...(state.raw ? { raw: state.raw } : {}),
          }
          return
        }

        yield {
          type: StreamEventType.NativeToolDelta,
          nativeToolId: state.id,
          status: state.status,
          ...(state.action ? { action: state.action } : {}),
          ...(state.sources ? { sources: state.sources } : {}),
          ...(state.raw ? { raw: state.raw } : {}),
        }
      }

      const emitReasoningState = function* (state: GeminiReasoningState): Generator<StreamEvent> {
        yield {
          type: StreamEventType.ReasoningState,
          reasoning: {
            id: state.id,
            provider: 'gemini-interactions',
            status: state.status,
            ...(state.summary ? { summary: state.summary } : {}),
            ...(state.encryptedContent ? { encryptedContent: state.encryptedContent } : {}),
            ...(state.raw ? { raw: state.raw } : {}),
          },
        }
      }

      const ensureReasoning = function* (
        step: Record<string, unknown>,
        finish = false,
      ): Generator<StreamEvent, GeminiReasoningState | undefined> {
        const index = asNumber(step.index)
        if (index === undefined) return undefined

        const id = reasoningIdsByIndex.get(index) ?? geminiReasoningId(interactionId, index)
        reasoningIdsByIndex.set(index, id)

        const mapped = mapReasoning(step, finish ? 'completed' : 'in_progress', id)
        const state =
          reasoningStates.get(id) ??
          ({
            id,
            status: mapped.status,
          } satisfies GeminiReasoningState)
        state.status = mapped.status
        if (mapped.summary !== undefined) state.summary = mapped.summary
        if (mapped.encryptedContent !== undefined) state.encryptedContent = mapped.encryptedContent
        if (mapped.raw !== undefined) state.raw = asRecord(mapped.raw)
        reasoningStates.set(id, state)

        yield* emitReasoningState(state)
        return state
      }

      const applyReasoningDelta = function* (
        data: Record<string, unknown>,
      ): Generator<StreamEvent, boolean> {
        const delta = asRecord(data.delta)
        const deltaType = stepType(delta ?? {})
        if (deltaType !== 'thought_summary' && deltaType !== 'thought_signature') return false

        const index = asNumber(data.index)
        if (index === undefined) return false

        const id = reasoningIdsByIndex.get(index) ?? geminiReasoningId(interactionId, index)
        reasoningIdsByIndex.set(index, id)

        const state =
          reasoningStates.get(id) ??
          ({
            id,
            status: 'in_progress',
          } satisfies GeminiReasoningState)
        state.status = 'in_progress'
        state.raw = {
          ...(state.raw ?? {}),
          type: 'thought',
          ...(delta ? { delta } : {}),
        }

        if (deltaType === 'thought_summary') {
          const text = extractText(delta?.content) ?? extractText(delta) ?? ''
          if (text) state.summary = `${state.summary ?? ''}${text}`
        } else {
          const signature = asString(delta?.signature) ?? asString(delta?.thought_signature)
          if (signature) state.encryptedContent = signature
          state.raw = {
            ...(state.raw ?? {}),
            ...(state.encryptedContent ? { signature: state.encryptedContent } : {}),
          }
        }

        reasoningStates.set(id, state)
        yield* emitReasoningState(state)
        return true
      }

      const finishReasoningByIndex = function* (index: number): Generator<StreamEvent, boolean> {
        const id = reasoningIdsByIndex.get(index)
        if (!id) return false
        const state = reasoningStates.get(id)
        if (!state) return false

        state.status = 'completed'
        reasoningStates.set(id, state)
        yield* emitReasoningState(state)
        return true
      }

      const handleStep = function* (
        step: Record<string, unknown>,
        finish = false,
      ): Generator<StreamEvent> {
        if (isGoogleSearchStep(step)) {
          const state = yield* ensureNativeTool(step)
          if (stepType(step) === 'google_search_result') {
            state.status = mapNativeToolStatus(step.status ?? 'completed')
            const sources = mapSourcesFromStep(step)
            if (sources.length > 0) state.sources = sources
            yield* emitNativeToolUpdate(state, true)
            if (state.sources) yield* emitSources(state.sources)
            return
          }
          yield* emitNativeToolUpdate(state, finish)
          return
        }

        if (isReasoningStep(step)) {
          yield* ensureReasoning(step, finish)
          return
        }

        if (isModelOutputStep(step)) {
          const text = extractText(step)
          if (text) yield { type: StreamEventType.TextDelta, text }
          const citations = [
            ...mapCitationsFromAnnotations(step.annotations),
            ...mapCitationsFromGroundingMetadata(step.groundingMetadata ?? step.grounding_metadata),
          ]
          yield* emitSources(citations)
          return
        }

        if (stepType(step) === 'function_call') {
          sawToolCall = true
          const id = asString(step.id) ?? asString(step.call_id) ?? `gemini_call_${stepStates.size}`
          const name = asString(step.name) ?? 'function'
          yield { type: StreamEventType.ToolCallStart, toolCall: { id, name } }
          yield {
            type: StreamEventType.ToolCallDelta,
            toolCallId: id,
            arguments: JSON.stringify(step.arguments ?? step.args ?? {}),
          }
          yield { type: StreamEventType.ToolCallEnd, toolCallId: id }
        }
      }

      for await (const sse of parseSSE(response.body, options?.signal)) {
        let data: Record<string, unknown>
        try {
          data = JSON.parse(sse.data)
        } catch {
          continue
        }

        const eventType = sse.event ?? data.type
        const payload = eventPayload(data)

        if (eventType === 'interaction.created') {
          const interaction = asRecord(data.interaction) ?? data
          interactionId = asString(interaction.id) ?? interactionId
          continue
        }

        if (eventType === 'interaction.completed' || eventType === 'interaction.complete') {
          const interaction = asRecord(data.interaction) ?? data
          interactionId = asString(interaction.id) ?? interactionId
          const steps = Array.isArray(interaction.steps) ? interaction.steps : []
          for (let index = 0; index < steps.length; index++) {
            const item = steps[index]
            const step = asRecord(item)
            if (step) yield* handleStep({ ...step, index }, true)
          }

          emittedFinish = true
          yield {
            type: StreamEventType.Finish,
            finishReason: sawToolCall ? FinishReason.ToolCalls : FinishReason.Stop,
            usage: mapUsage(
              interaction.usageMetadata ?? interaction.usage_metadata ?? data.usageMetadata,
            ),
          }
          continue
        }

        if (eventType === 'step.start' || eventType === 'step.started') {
          if (payload) {
            const step =
              isReasoningStep(payload) && typeof data.index === 'number'
                ? { ...payload, index: data.index }
                : payload
            yield* handleStep(step)
          }
          continue
        }

        if (eventType === 'step.delta' || eventType === 'step.updated') {
          if (yield* applyReasoningDelta(data)) continue
          if (payload) {
            const step =
              isReasoningStep(payload) && typeof data.index === 'number'
                ? { ...payload, index: data.index }
                : payload
            yield* handleStep(step)
          }
          continue
        }

        if (eventType === 'step.stop' || eventType === 'step.completed') {
          if (payload) {
            const step =
              isReasoningStep(payload) && typeof data.index === 'number'
                ? { ...payload, index: data.index }
                : payload
            if (isReasoningStep(step)) {
              yield* handleStep(step, true)
            } else if (
              typeof data.index === 'number' &&
              (yield* finishReasoningByIndex(data.index))
            ) {
              continue
            } else {
              yield* handleStep(step, true)
            }
          }
          continue
        }

        if (
          payload &&
          (isModelOutputStep(payload) || isReasoningStep(payload) || isGoogleSearchStep(payload))
        ) {
          const step =
            isReasoningStep(payload) && typeof data.index === 'number'
              ? { ...payload, index: data.index }
              : payload
          yield* handleStep(step, eventType === 'step.completed')
          continue
        }

        if (eventType === 'error') {
          yield {
            type: StreamEventType.Error,
            error: new Error(`Gemini Interactions stream error: ${JSON.stringify(data)}`),
          }
        }
      }

      if (!emittedFinish) {
        yield {
          type: StreamEventType.Finish,
          finishReason: sawToolCall ? FinishReason.ToolCalls : FinishReason.Stop,
        }
      }
    },
  }
}
