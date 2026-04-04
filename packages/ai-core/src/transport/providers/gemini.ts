import type { PipelineOutput, StreamEvent, Message, ContentPart, ToolDefinition } from '../../types'
import type { Transport } from '../transport'

function formatMessages(messages: Message[]): {
  systemInstruction?: unknown
  contents: unknown[]
} {
  let systemInstruction: unknown
  const contents: unknown[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as ContentPart[])
            .filter((p) => p.type === 'text')
            .map((p) => (p as { text: string }).text)
            .join('\n')
      systemInstruction = { parts: [{ text }] }
      continue
    }

    const geminiRole = msg.role === 'assistant' ? 'model' : msg.role === 'tool' ? 'function' : 'user'

    if (typeof msg.content === 'string') {
      contents.push({
        role: geminiRole,
        parts: [{ text: msg.content }],
      })
      continue
    }

    const parts: unknown[] = []
    for (const part of msg.content as ContentPart[]) {
      switch (part.type) {
        case 'text':
          parts.push({ text: part.text })
          break
        case 'image':
          if (part.image.startsWith('http')) {
            parts.push({ fileData: { fileUri: part.image, mimeType: part.mimeType ?? 'image/png' } })
          } else {
            parts.push({
              inlineData: { data: part.image, mimeType: part.mimeType ?? 'image/png' },
            })
          }
          break
        case 'tool_call':
          parts.push({
            functionCall: {
              name: part.toolCall.name,
              args: JSON.parse(part.toolCall.arguments || '{}'),
            },
          })
          break
        case 'tool_result':
          parts.push({
            functionResponse: {
              name: part.toolCallId,
              response: { result: part.result },
            },
          })
          break
      }
    }

    contents.push({ role: geminiRole, parts })
  }

  return { systemInstruction, contents }
}

function formatTools(tools: ToolDefinition[]): unknown[] {
  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  ]
}

export function createGeminiTransport(): Transport {
  return {
    async *stream(request: PipelineOutput): AsyncIterable<StreamEvent> {
      const { messages, tools, provider, options } = request
      const baseUrl = provider.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'

      const { systemInstruction, contents } = formatMessages(messages)

      const body: Record<string, unknown> = { contents }
      if (systemInstruction) body.systemInstruction = systemInstruction
      if (tools && tools.length > 0) body.tools = formatTools(tools)

      const generationConfig: Record<string, unknown> = {}
      if (options?.temperature !== undefined) generationConfig.temperature = options.temperature
      if (options?.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens
      if (options?.topP !== undefined) generationConfig.topP = options.topP
      if (options?.stop) generationConfig.stopSequences = options.stop
      if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig

      const url = `${baseUrl}/models/${provider.model}:streamGenerateContent?key=${provider.apiKey}&alt=sse`

      const response = await fetch(url, {
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
        yield { type: 'error', error: new Error(`Gemini API error ${response.status}: ${text}`) }
        return
      }

      if (!response.body) {
        yield { type: 'error', error: new Error('No response body') }
        return
      }

      // Gemini streams JSON chunks separated by newlines when using alt=sse
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          if (options?.signal?.aborted) break
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE format: data: {...}\n\n
          const parts = buffer.split('\n\n')
          buffer = parts.pop()!

          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed) continue

            let jsonStr = trimmed
            if (jsonStr.startsWith('data:')) {
              jsonStr = jsonStr.slice(5).trim()
            }
            if (!jsonStr) continue

            let chunk: Record<string, unknown>
            try {
              chunk = JSON.parse(jsonStr)
            } catch {
              continue
            }

            const candidates = chunk.candidates as Array<Record<string, unknown>> | undefined
            if (!candidates || candidates.length === 0) continue

            const candidate = candidates[0]
            const content = candidate.content as Record<string, unknown> | undefined
            const finishReason = candidate.finishReason as string | undefined

            if (content) {
              const cParts = content.parts as Array<Record<string, unknown>> | undefined
              if (cParts) {
                for (const p of cParts) {
                  if (typeof p.text === 'string') {
                    yield { type: 'text_delta', text: p.text }
                  }
                  if (p.functionCall) {
                    const fc = p.functionCall as Record<string, unknown>
                    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
                    yield {
                      type: 'tool_call_start',
                      toolCall: { id: callId, name: fc.name as string },
                    }
                    yield {
                      type: 'tool_call_delta',
                      toolCallId: callId,
                      arguments: JSON.stringify(fc.args ?? {}),
                    }
                    yield { type: 'tool_call_end', toolCallId: callId }
                  }
                }
              }
            }

            if (finishReason) {
              const usageMeta = chunk.usageMetadata as Record<string, number> | undefined
              yield {
                type: 'finish',
                finishReason: finishReason === 'STOP' ? 'stop'
                  : finishReason === 'MAX_TOKENS' ? 'length'
                  : finishReason === 'SAFETY' ? 'content_filter'
                  : 'stop',
                usage: usageMeta
                  ? {
                      promptTokens: usageMeta.promptTokenCount ?? 0,
                      completionTokens: usageMeta.candidatesTokenCount ?? 0,
                      totalTokens: usageMeta.totalTokenCount ?? 0,
                    }
                  : undefined,
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
  }
}
