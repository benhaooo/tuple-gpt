import type { PipelineOutput, StreamEvent, Message, ToolDefinition } from '../../types'
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
            const block = data.content_block as Record<string, unknown>
            if (block?.type === 'tool_use') {
              currentToolId = block.id as string
              yield {
                type: StreamEventType.ToolCallStart,
                toolCall: { id: block.id as string, name: block.name as string },
              }
            }
            break
          }

          case 'content_block_delta': {
            const delta = data.delta as Record<string, unknown>
            if (delta?.type === 'text_delta') {
              yield { type: StreamEventType.TextDelta, text: delta.text as string }
            } else if (delta?.type === 'input_json_delta') {
              yield {
                type: StreamEventType.ToolCallDelta,
                toolCallId: currentToolId,
                arguments: delta.partial_json as string,
              }
            }
            break
          }

          case 'content_block_stop': {
            if (currentToolId) {
              yield { type: StreamEventType.ToolCallEnd, toolCallId: currentToolId }
              currentToolId = ''
            }
            break
          }

          case 'message_delta': {
            const delta = data.delta as Record<string, unknown>
            const stopReason = delta?.stop_reason as string | null
            const usage = data.usage as Record<string, number> | undefined
            if (stopReason) {
              yield {
                type: StreamEventType.Finish,
                finishReason:
                  stopReason === 'tool_use'
                    ? FinishReason.ToolCalls
                    : stopReason === 'end_turn'
                      ? FinishReason.Stop
                      : (stopReason as 'length'),
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
