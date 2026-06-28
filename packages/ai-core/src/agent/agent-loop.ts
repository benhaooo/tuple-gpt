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
  Citation,
  NativeToolContentPart,
  ToolCallContentPart,
  ReasoningContentPart,
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
    const assistantContent: ContentPart[] = []
    const pendingToolCalls: ToolCall[] = []
    const toolCallArgs: Map<string, string> = new Map()
    const toolCallParts: Map<string, ToolCallContentPart> = new Map()
    const nativeToolParts: Map<string, NativeToolContentPart> = new Map()
    let finishReason: string | undefined

    for await (const event of transport.stream(prepared)) {
      yield event

      switch (event.type) {
        case StreamEventType.TextDelta:
          appendTextPart(assistantContent, event.text)
          break
        case StreamEventType.ToolCallStart:
          pendingToolCalls.push({
            id: event.toolCall.id,
            name: event.toolCall.name,
            arguments: '',
          })
          toolCallArgs.set(event.toolCall.id, '')
          {
            const part: ToolCallContentPart = {
              type: 'tool_call',
              toolCall: { id: event.toolCall.id, name: event.toolCall.name, arguments: '' },
            }
            toolCallParts.set(event.toolCall.id, part)
            assistantContent.push(part)
          }
          break
        case StreamEventType.ToolCallDelta: {
          const existing = toolCallArgs.get(event.toolCallId) ?? ''
          const nextArguments = existing + event.arguments
          toolCallArgs.set(event.toolCallId, nextArguments)
          const part = toolCallParts.get(event.toolCallId)
          if (part) part.toolCall.arguments = nextArguments
          break
        }
        case StreamEventType.ToolCallEnd:
          for (const tc of pendingToolCalls) {
            if (tc.id === event.toolCallId) {
              tc.arguments = toolCallArgs.get(event.toolCallId) ?? ''
            }
          }
          {
            const part = toolCallParts.get(event.toolCallId)
            if (part) part.toolCall.arguments = toolCallArgs.get(event.toolCallId) ?? ''
          }
          break
        case StreamEventType.NativeToolStart: {
          const part: NativeToolContentPart = {
            type: 'native_tool',
            nativeTool: { ...event.nativeTool },
          }
          nativeToolParts.set(event.nativeTool.id, part)
          assistantContent.push(part)
          break
        }
        case StreamEventType.NativeToolDelta: {
          const part = nativeToolParts.get(event.nativeToolId)
          if (part) {
            part.nativeTool = {
              ...part.nativeTool,
              ...(event.status ? { status: event.status } : {}),
              ...(event.action ? { action: event.action } : {}),
              ...(event.sources ? { sources: event.sources } : {}),
              ...(event.raw ? { raw: event.raw } : {}),
            }
          }
          break
        }
        case StreamEventType.NativeToolEnd: {
          const part = nativeToolParts.get(event.nativeToolId)
          if (part) {
            part.nativeTool = {
              ...part.nativeTool,
              status: event.status,
              ...(event.action ? { action: event.action } : {}),
              ...(event.sources ? { sources: event.sources } : {}),
              ...(event.raw ? { raw: event.raw } : {}),
            }
          }
          break
        }
        case StreamEventType.TextAnnotations:
          applyCitationsToLastText(assistantContent, event.citations)
          break
        case StreamEventType.ReasoningState:
          upsertReasoningPart(assistantContent, event.reasoning)
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
    const newToolCallParts = pendingToolCalls
      .map(tc => toolCallParts.get(tc.id))
      .filter((part): part is ToolCallContentPart => !!part)
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

function appendTextPart(content: ContentPart[], text: string): void {
  if (!text) return

  const last = content[content.length - 1]
  if (last?.type === 'text') {
    last.text += text
    return
  }

  content.push({ type: 'text', text })
}

function applyCitationsToLastText(content: ContentPart[], citations: Citation[]): void {
  if (citations.length === 0) return

  const lastText = [...content].reverse().find(part => part.type === 'text')
  if (lastText?.type !== 'text') return

  lastText.citations = [...(lastText.citations ?? []), ...citations]
}

function upsertReasoningPart(
  content: ContentPart[],
  reasoning: ReasoningContentPart['reasoning'],
): void {
  const index = content.findIndex(
    part => part.type === 'reasoning' && part.reasoning.id === reasoning.id,
  )
  const existing = index === -1 ? undefined : content[index]
  const part: ReasoningContentPart = {
    type: 'reasoning',
    reasoning:
      existing?.type === 'reasoning'
        ? {
            ...existing.reasoning,
            ...reasoning,
            ...(reasoning.summary !== undefined ? { summary: reasoning.summary } : {}),
            ...(reasoning.encryptedContent !== undefined
              ? { encryptedContent: reasoning.encryptedContent }
              : {}),
            ...(reasoning.raw !== undefined ? { raw: reasoning.raw } : {}),
          }
        : { ...reasoning },
  }

  if (index === -1) {
    content.push(part)
  } else {
    content[index] = part
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
