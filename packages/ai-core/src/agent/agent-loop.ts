import type {
  Message,
  StreamEvent,
  ToolCall,
  ToolDefinition,
  ProviderConfig,
  RequestOptions,
  PipelineOutput,
} from '../types'
import { Role, FinishReason, StreamEventType } from '../types'
import type { Transport } from '../transport/transport'
import type { PipelineStep } from '../pipeline/pipeline'
import { createPipeline } from '../pipeline/pipeline'
import type { ToolRunner } from './tool-runner'

export interface AgentLoopOptions {
  messages: Message[]
  transport: Transport
  tools?: ToolDefinition[]
  /**
   * Resolves tool calls. ai-core does not care how it works internally —
   * it only reacts to the outcome (resolved / awaiting / unknown).
   */
  toolRunner?: ToolRunner
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
    toolRunner,
    pipeline: pipelineSteps,
    provider,
    options,
    maxTurns = 10,
  } = opts

  const pipeline =
    pipelineSteps && pipelineSteps.length > 0 ? createPipeline(...pipelineSteps) : undefined

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
        case StreamEventType.TextDelta:
          textContent += event.text
          break
        case StreamEventType.ToolCallStart:
          pendingToolCalls.push({
            id: event.toolCall.id,
            name: event.toolCall.name,
            arguments: '',
          })
          toolCallArgs.set(event.toolCall.id, '')
          break
        case StreamEventType.ToolCallDelta: {
          const existing = toolCallArgs.get(event.toolCallId) ?? ''
          toolCallArgs.set(event.toolCallId, existing + event.arguments)
          break
        }
        case StreamEventType.ToolCallEnd:
          for (const tc of pendingToolCalls) {
            if (tc.id === event.toolCallId) {
              tc.arguments = toolCallArgs.get(event.toolCallId) ?? ''
            }
          }
          break
        case StreamEventType.Finish:
          finishReason = event.finishReason
          break
        case StreamEventType.Error:
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
        role: Role.Assistant,
        content:
          assistantContent.length === 1 && assistantContent[0].type === 'text'
            ? textContent
            : assistantContent,
      })
    }

    // 4. Check termination
    if (finishReason !== FinishReason.ToolCalls || pendingToolCalls.length === 0 || !toolRunner) {
      break
    }

    // 5. Resolve all tool calls in parallel via the runner.
    //    The runner decides whether each call runs locally, awaits external
    //    input, or is unknown. ai-core only reacts to the outcome.
    const abortController = new AbortController()
    const signal = options?.signal ?? abortController.signal
    const outcomes = await Promise.all(
      pendingToolCalls.map(async tc => ({
        call: tc,
        outcome: await toolRunner.run(tc.name, tc.arguments, {
          toolCallId: tc.id,
          signal,
        }),
      })),
    )

    // 6. Apply outcomes in order:
    //    - resolved: emit ToolResult, append tool_result message
    //    - awaiting: emit ToolInteractionRequired, mark for exit
    //    - unknown:  treat as resolved error so the LLM can recover
    let hasAwaiting = false
    for (const { call, outcome } of outcomes) {
      if (outcome.kind === 'resolved') {
        yield {
          type: StreamEventType.ToolResult,
          toolCallId: call.id,
          result: outcome.result,
          ...(outcome.isError ? { isError: true } : {}),
        }
        messages.push({
          role: Role.Tool,
          content: [
            {
              type: 'tool_result',
              toolCallId: call.id,
              result: outcome.result,
              isError: outcome.isError,
            },
          ],
        })
      } else if (outcome.kind === 'unknown') {
        const errMsg = `Tool "${call.name}" is not registered`
        yield {
          type: StreamEventType.ToolResult,
          toolCallId: call.id,
          result: errMsg,
          isError: true,
        }
        messages.push({
          role: Role.Tool,
          content: [
            {
              type: 'tool_result',
              toolCallId: call.id,
              result: errMsg,
              isError: true,
            },
          ],
        })
      } else {
        hasAwaiting = true
        yield {
          type: StreamEventType.ToolInteractionRequired,
          toolCallId: call.id,
          toolName: call.name,
          arguments: call.arguments,
          component: outcome.component,
        }
      }
    }

    // 7. If any tool call awaits external input, exit the loop.
    //    The caller resumes by re-invoking with tool_result messages appended.
    if (hasAwaiting) {
      return
    }
  }
}
