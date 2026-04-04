import type { PipelineOutput, StreamEvent, Message, ContentPart, ToolDefinition } from '../../types'
import { Role, StreamEventType, FinishReason } from '../../types'
import type { Transport } from '../transport'
import { parseSSE } from '../sse-parser'

function formatMessages(messages: Message[]): unknown[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content }
    }

    // Handle content parts
    const parts: unknown[] = []
    const toolCalls: unknown[] = []

    for (const part of msg.content as ContentPart[]) {
      switch (part.type) {
        case 'text':
          parts.push({ type: 'text', text: part.text })
          break
        case 'image':
          parts.push({
            type: 'image_url',
            image_url: { url: part.image },
          })
          break
        case 'tool_call':
          toolCalls.push({
            id: part.toolCall.id,
            type: 'function',
            function: {
              name: part.toolCall.name,
              arguments: part.toolCall.arguments,
            },
          })
          break
        case 'tool_result':
          // Tool results are separate messages in OpenAI format
          // They'll be handled at the message level
          parts.push({ type: 'text', text: part.result })
          break
      }
    }

    const result: Record<string, unknown> = { role: msg.role }

    if (msg.role === Role.Tool) {
      // OpenAI expects tool role messages with tool_call_id
      const toolResult = (msg.content as ContentPart[]).find(
        (p) => p.type === 'tool_result',
      )
      if (toolResult && toolResult.type === 'tool_result') {
        result.tool_call_id = toolResult.toolCallId
        result.content = toolResult.result
      }
      return result
    }

    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls
      result.content = parts.length > 0 ? parts : null
    } else {
      result.content = parts.length === 1 && parts[0] && typeof parts[0] === 'object' && 'text' in (parts[0] as Record<string, unknown>)
        ? (parts[0] as { text: string }).text
        : parts
    }

    return result
  })
}

function formatTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

export function createOpenAITransport(): Transport {
  return {
    async *stream(request: PipelineOutput): AsyncIterable<StreamEvent> {
      const { messages, tools, provider, options } = request
      const baseUrl = provider.baseUrl ?? 'https://api.openai.com/v1'
      const toolCallIdByIndex = new Map<number, string>()

      const body: Record<string, unknown> = {
        model: provider.model,
        messages: formatMessages(messages),
        stream: true,
        stream_options: { include_usage: true },
      }

      if (tools && tools.length > 0) {
        body.tools = formatTools(tools)
      }
      if (options?.temperature !== undefined) body.temperature = options.temperature
      if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens
      if (options?.topP !== undefined) body.top_p = options.topP
      if (options?.stop) body.stop = options.stop

      const response = await fetch(`${baseUrl}/chat/completions`, {
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
        yield { type: StreamEventType.Error, error: new Error(`OpenAI API error ${response.status}: ${text}`) }
        return
      }

      if (!response.body) {
        yield { type: StreamEventType.Error, error: new Error('No response body') }
        return
      }

      for await (const sse of parseSSE(response.body, options?.signal)) {
        if (sse.data === '[DONE]') {
          break
        }

        let chunk: Record<string, unknown>
        try {
          chunk = JSON.parse(sse.data)
        } catch {
          continue
        }

        const choices = chunk.choices as Array<Record<string, unknown>> | undefined
        const usage = chunk.usage as Record<string, number> | undefined

        if (choices && choices.length > 0) {
          const delta = choices[0].delta as Record<string, unknown> | undefined
          const finishReason = choices[0].finish_reason as string | null

          if (delta) {
            // Text content
            if (typeof delta.content === 'string' && delta.content) {
              yield { type: StreamEventType.TextDelta, text: delta.content }
            }

            // Tool calls
            const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
            if (toolCalls) {
              for (const tc of toolCalls) {
                const fn = tc.function as Record<string, unknown> | undefined
                const index = tc.index as number | undefined
                if (fn?.name) {
                  const id = tc.id as string
                  // Track id by index for subsequent delta chunks
                  if (index !== undefined) toolCallIdByIndex.set(index, id)
                  yield {
                    type: StreamEventType.ToolCallStart,
                    toolCall: { id, name: fn.name as string },
                  }
                }
                if (fn?.arguments && typeof fn.arguments === 'string') {
                  // Resolve toolCallId: use tc.id if present, otherwise look up by index
                  const toolCallId = (tc.id as string) || (index !== undefined ? toolCallIdByIndex.get(index) ?? '' : '')
                  yield {
                    type: StreamEventType.ToolCallDelta,
                    toolCallId,
                    arguments: fn.arguments,
                  }
                }
              }
            }
          }

          if (finishReason) {
            // Emit tool_call_end for each pending tool call
            if (finishReason === 'tool_calls') {
              for (const id of toolCallIdByIndex.values()) {
                yield { type: StreamEventType.ToolCallEnd, toolCallId: id }
              }
            }
            yield {
              type: StreamEventType.Finish,
              finishReason: finishReason === 'tool_calls' ? FinishReason.ToolCalls : finishReason as 'stop' | 'length' | 'content_filter',
              usage: usage
                ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                  }
                : undefined,
            }
            toolCallIdByIndex.clear()
          }
        }

        // Usage-only chunk (with stream_options.include_usage)
        if (usage && (!choices || choices.length === 0)) {
          // Usage already emitted with finish, skip
        }
      }
    },
  }
}
