import type { ToolDefinition } from '@tuple-gpt/ai-core'

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface McpServerConfig {
  id: string
  name: string
  url: string
  headers?: Record<string, string>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface McpServerState {
  config: McpServerConfig
  status: McpConnectionStatus
  error?: string
  tools: ToolDefinition[]
}
