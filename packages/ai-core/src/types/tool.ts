export interface ToolDefinition {
  name: string
  description: string
  /** JSON Schema for the tool's parameters */
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: string
}

export interface ToolResult {
  toolCallId: string
  result: string
  isError?: boolean
}

export interface ToolExecutionContext {
  toolCallId: string
  signal: AbortSignal
  /**
   * True only when execute() is being invoked as a re-run after a
   * Resolution.approve. Tools can branch on this to enforce gates: first
   * call returns suspend('permission'), second call (with approved=true)
   * actually performs the side effect.
   */
  approved?: boolean
}

/**
 * Caller-supplied answer for a previously suspended tool call. Drives the
 * agent-loop's resume phase:
 *   - result : skip execute(); inject the given content as tool_result.
 *   - deny   : inject an isError tool_result with the given message.
 *   - approve: re-invoke execute() with ctx.approved = true.
 */
export type Resolution =
  | { toolCallId: string; type: 'result'; content: string; isError?: boolean }
  | { toolCallId: string; type: 'deny'; message: string }
  | { toolCallId: string; type: 'approve' }

/**
 * Outcome of a single tool execution. Tools return either a finished result
 * (the loop appends a tool_result and keeps going) or a suspend (the loop
 * pauses and yields a ToolInteractionRequired event for the caller to resolve).
 *
 * The execution layer does not classify tools up-front — every tool returns
 * the same union and the loop reacts to whichever variant comes back.
 */
export type ToolExecution =
  | { type: 'result'; content: string; isError?: boolean }
  | { type: 'suspend'; reason: string; payload?: unknown }

/**
 * A tool the agent loop can execute. Combines the LLM-facing definition
 * (name/description/parameters) with the runtime executor.
 */
export interface Tool {
  name: string
  description: string
  /** JSON Schema for the tool's parameters */
  parameters: Record<string, unknown>
  execute: (args: string, context: ToolExecutionContext) => Promise<ToolExecution> | ToolExecution
}

export function defineTool(tool: Tool): Tool {
  return tool
}

export function toToolDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }
}
