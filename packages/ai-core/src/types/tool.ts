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
}

export interface ToolHandlerResult {
  content: string
  isError?: boolean
}

/**
 * A tool handler that ai-core can execute autonomously inside the agent loop.
 * Tools that need to pause the loop for outside-the-loop work (user interaction,
 * external approval, etc.) should not be registered in the executor — when the
 * model emits a tool call whose name is missing from the executor, the loop
 * yields ToolInteractionRequired and exits, leaving resumption to the caller.
 */
export interface ToolHandler {
  execute(args: string, context: ToolExecutionContext): Promise<ToolHandlerResult>
}
