import type { ToolDefinition, ToolHandler } from '@tuple-gpt/ai-core'

/** A tool that ai-core can execute autonomously inside the agent loop. */
export interface AutoTool {
  kind: 'auto'
  definition: ToolDefinition
  handler: ToolHandler
}

/** A tool whose call must be resolved outside the agent loop (e.g. user input). */
export interface InteractiveTool {
  kind: 'interactive'
  definition: ToolDefinition
  /** Vue component name resolved by the UI layer. */
  component: string
}

export type BuiltinTool = AutoTool | InteractiveTool
