import type { Message, PipelineOutput, StreamEvent, ToolDefinition, Usage } from '../../types'
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

function formatInput(
  messages: Message[],
  previousOutputItems: ResponsesInputItem[] = [],
): ResponsesInputItem[] {
  const out: ResponsesInputItem[] = []
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
              functionItems.push(...previousOutputItems)
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
      }
    }

    if (messageParts.length > 0) {
      out.push(formatMessage(msg.role, messageParts))
    }
    out.push(...functionItems)
  }

  return out
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

function fallbackToolCallId(outputIndex: unknown, itemId: unknown): string {
  const id = asString(itemId)
  if (id) return id
  return typeof outputIndex === 'number' ? `response_tool_${outputIndex}` : 'response_tool'
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
      let sawToolCall = false
      let emittedFinish = false

      const body: Record<string, unknown> = {
        model: provider.model,
        input: formatInput(messages, previousOutputItemsForNextRequest),
        stream: true,
        store: false,
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

      const handleCompletedResponse = function* (
        event: Record<string, unknown>,
      ): Generator<StreamEvent> {
        const responseRecord = asRecord(event.response)
        const output = Array.isArray(responseRecord?.output) ? responseRecord.output : []
        const reusableOutputItems: ResponsesInputItem[] = []

        for (let i = 0; i < output.length; i++) {
          const item = asRecord(output[i])
          if (!item) continue
          if (item.type === 'reasoning' || item.type === 'function_call') {
            reusableOutputItems.push(item)
          }
          yield* handleFunctionCallItem({ output_index: i }, item, true)
        }
        previousOutputItemsForNextRequest = sawToolCall ? reusableOutputItems : []

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
            if (item) yield* handleFunctionCallItem(event, item)
            break
          }
          case 'response.output_item.done': {
            const item = asRecord(event.item)
            if (item) yield* handleFunctionCallItem(event, item, true)
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
