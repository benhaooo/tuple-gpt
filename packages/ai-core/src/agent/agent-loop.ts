import type { Message, StreamEvent, ToolCall, ToolDefinition, ProviderConfig, RequestOptions, PipelineOutput } from '../types'
import type { Transport } from '../transport/transport'
import type { PipelineStep } from '../pipeline/pipeline'
import { createPipeline } from '../pipeline/pipeline'
import type { ToolExecutor } from './tool-executor'
import { executeToolCall } from './tool-executor'

export interface AgentLoopOptions {
  messages: Message[]
  transport: Transport
  tools?: ToolDefinition[]
  toolExecutor?: ToolExecutor
  pipeline?: PipelineStep[]
  provider: ProviderConfig
  options?: RequestOptions
  maxTurns?: number
}

export async function* runAgentLoop(opts: AgentLoopOptions): AsyncGenerator<StreamEvent> {
  const {
    messages,
    transport,
    tools,
    toolExecutor,
    pipeline: pipelineSteps,
    provider,
    options,
    maxTurns = 10,
  } = opts

  const pipeline = pipelineSteps && pipelineSteps.length > 0
    ? createPipeline(...pipelineSteps)
    : undefined

  let turn = 0

  while (turn < maxTurns) {
    turn++

    // 1. Pipeline — prepare request
    let prepared: PipelineOutput = { messages, tools, provider, options }
    if (pipeline) {
      prepared = pipeline(prepared)
    }

    // 2. Transport — stream response
    const pendingToolCalls: ToolCall[] = []
    const toolCallArgs: Map<string, string> = new Map()
    let textContent = ''
    let finishReason: string | undefined

    for await (const event of transport.stream(prepared)) {
      yield event

      switch (event.type) {
        case 'text_delta':
          textContent += event.text
          break
        case 'tool_call_start':
          pendingToolCalls.push({
            id: event.toolCall.id,
            name: event.toolCall.name,
            arguments: '',
          })
          toolCallArgs.set(event.toolCall.id, '')
          break
        case 'tool_call_delta': {
          const existing = toolCallArgs.get(event.toolCallId) ?? ''
          toolCallArgs.set(event.toolCallId, existing + event.arguments)
          break
        }
        case 'tool_call_end':
          // Finalize arguments for this tool call
          for (const tc of pendingToolCalls) {
            if (tc.id === event.toolCallId) {
              tc.arguments = toolCallArgs.get(event.toolCallId) ?? ''
            }
          }
          break
        case 'finish':
          finishReason = event.finishReason
          break
        case 'error':
          // Error already yielded, stop the loop
          return
      }
    }

    // 3. Append assistant message to history
    if (textContent || pendingToolCalls.length > 0) {
      const assistantContent: import('../types').ContentPart[] = []
      if (textContent) {
        assistantContent.push({ type: 'text', text: textContent })
      }
      for (const tc of pendingToolCalls) {
        assistantContent.push({
          type: 'tool_call',
          toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments },
        })
      }
      messages.push({
        role: 'assistant',
        content: assistantContent.length === 1 && assistantContent[0].type === 'text'
          ? textContent
          : assistantContent,
      })
    }

    // 4. Check termination
    if (finishReason !== 'tool_calls' || pendingToolCalls.length === 0 || !toolExecutor) {
      break
    }

    // 5. Execute tools in parallel
    const results = await Promise.all(
      pendingToolCalls.map(async (tc) => {
        const result = await executeToolCall(toolExecutor, tc.name, tc.arguments)
        return { toolCallId: tc.id, ...result }
      }),
    )

    // 6. Append tool results to messages
    for (const result of results) {
      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: result.toolCallId,
            result: result.result,
            isError: result.isError,
          },
        ],
      })
    }
  }
}
