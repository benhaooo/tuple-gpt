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
