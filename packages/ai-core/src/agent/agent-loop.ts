import type {
  Message,
  StreamEvent,
  Tool,
  ToolCall,
  ToolDefinition,
  ToolExecution,
  ToolExecutionContext,
  Resolution,
  ProviderConfig,
  RequestOptions,
  PipelineOutput,
  ContentPart,
  ToolCallContentPart,
} from '../types'
import { Role, FinishReason, StreamEventType, toToolDefinition } from '../types'
import type { Transport } from '../transport/transport'
import type { PipelineStep } from '../pipeline/pipeline'
import { createPipeline } from '../pipeline/pipeline'

export interface AgentLoopOptions {
  messages: Message[]
  transport: Transport
  /**
   * Tools available to the LLM. Definitions are sent to the provider; the
   * same Tool's execute() is invoked when the LLM calls it. Pass an empty
   * array (or omit) for chats without tools.
   */
  tools?: Tool[]
  /**
   * Resolutions for tool calls that previously suspended. Keyed by toolCallId.
   * The loop processes these *before* talking to the LLM:
   *   - result  → fill the tool_call part with given content (skips execute)
   *   - deny    → fill the tool_call part with isError + message
   *   - approve → re-invoke execute() with ctx.approved = true
   * After the resume phase the loop proceeds normally.
   */
  resolutions?: Resolution[]
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
    resolutions,
    pipeline: pipelineSteps = [],
    provider,
    options,
    maxTurns = 10,
  } = opts

  const pipeline = createPipeline(...pipelineSteps)
  const toolMap = new Map<string, Tool>((tools ?? []).map(t => [t.name, t]))
  const toolDefinitions: ToolDefinition[] | undefined = tools?.map(toToolDefinition)
  const abortController = new AbortController()
  const signal = options?.signal ?? abortController.signal

  // 0. Resume phase — apply resolutions to any pending tool calls in history.
  //    A pending call is a tool_call part whose `result` is still undefined.
  //    If a re-run via 'approve' suspends again, we yield ToolInteractionRequired
  //    and return; the caller resumes by re-invoking with a new resolution.
  if (resolutions && resolutions.length > 0) {
    const pendingParts = findPendingToolCallParts(messages)
    const byId = new Map(resolutions.map(r => [r.toolCallId, r]))

    for (const part of pendingParts) {
      const resolution = byId.get(part.toolCall.id)
      if (!resolution) continue

      if (resolution.type === 'result') {
        applyResult(part, resolution.content, resolution.isError)
        yield {
          type: StreamEventType.ToolResult,
          toolCallId: part.toolCall.id,
          result: resolution.content,
          ...(resolution.isError ? { isError: true } : {}),
        }
        continue
      }

      if (resolution.type === 'deny') {
        applyResult(part, resolution.message, true)
        yield {
          type: StreamEventType.ToolResult,
          toolCallId: part.toolCall.id,
          result: resolution.message,
          isError: true,
        }
        continue
      }

      // approve → re-execute the tool with ctx.approved = true
      const call: ToolCall = {
        id: part.toolCall.id,
        name: part.toolCall.name,
        arguments: part.toolCall.arguments,
      }
      const execution = await runTool(toolMap, call, {
        toolCallId: call.id,
        signal,
        approved: true,
      })

      if (execution.type === 'suspend') {
        yield {
          type: StreamEventType.ToolInteractionRequired,
          toolCallId: call.id,
          toolName: call.name,
          arguments: call.arguments,
          reason: execution.reason,
          payload: execution.payload,
        }
        return
      }

      applyResult(part, execution.content, execution.isError)
      yield {
        type: StreamEventType.ToolResult,
        toolCallId: call.id,
        result: execution.content,
        ...(execution.isError ? { isError: true } : {}),
      }
    }
  }

  let turn = 0

  while (turn < maxTurns) {
    turn++

    // 1. Pipeline — prepare request
    const prepared: PipelineOutput = pipeline({
      messages,
      tools: toolDefinitions,
      provider,
      options,
    })

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

    // 3. Append assistant message to history. tool_call parts start with
    //    no result; the dispatch step below fills them in.
    const assistantContent: ContentPart[] = []
    if (textContent) {
      assistantContent.push({ type: 'text', text: textContent })
    }
    const newToolCallParts: ToolCallContentPart[] = []
    for (const tc of pendingToolCalls) {
      const part: ToolCallContentPart = {
        type: 'tool_call',
        toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments },
      }
      newToolCallParts.push(part)
      assistantContent.push(part)
    }
    if (assistantContent.length > 0) {
      messages.push({ role: Role.Assistant, content: assistantContent })
    }

    // 4. Check termination
    if (finishReason !== FinishReason.ToolCalls || pendingToolCalls.length === 0 || !tools) {
      break
    }

    // 5. Dispatch all tool calls in parallel.
    const dispatched = await Promise.all(
      newToolCallParts.map(async part => {
        const call: ToolCall = {
          id: part.toolCall.id,
          name: part.toolCall.name,
          arguments: part.toolCall.arguments,
        }
        const execution = await runTool(toolMap, call, { toolCallId: call.id, signal })
        return { part, call, execution }
      }),
    )

    // 6. Apply executions in order. The first suspend exits the loop;
    //    the caller resumes by invoking again with a Resolution.
    for (const { part, call, execution } of dispatched) {
      if (execution.type === 'suspend') {
        yield {
          type: StreamEventType.ToolInteractionRequired,
          toolCallId: call.id,
          toolName: call.name,
          arguments: call.arguments,
          reason: execution.reason,
          payload: execution.payload,
        }
        return
      }

      applyResult(part, execution.content, execution.isError)
      yield {
        type: StreamEventType.ToolResult,
        toolCallId: call.id,
        result: execution.content,
        ...(execution.isError ? { isError: true } : {}),
      }
    }
  }
}

async function runTool(
  toolMap: Map<string, Tool>,
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolExecution> {
  const tool = toolMap.get(call.name)
  if (!tool) {
    return { type: 'result', content: `Tool "${call.name}" is not registered`, isError: true }
  }
  try {
    return await tool.execute(call.arguments, ctx)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { type: 'result', content: message, isError: true }
  }
}

function applyResult(part: ToolCallContentPart, result: string, isError?: boolean): void {
  part.result = result
  if (isError) part.isError = true
}

/**
 * Walk message history and return tool_call parts that have no result yet.
 * Order preserved from the message stream — the resume phase processes
 * resolutions in the order calls were originally made.
 */
function findPendingToolCallParts(messages: Message[]): ToolCallContentPart[] {
  const pending: ToolCallContentPart[] = []
  for (const message of messages) {
    if (message.role !== Role.Assistant) continue
    for (const part of message.content) {
      if (part.type === 'tool_call' && part.result === undefined) {
        pending.push(part)
      }
    }
  }
  return pending
}
