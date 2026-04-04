import type { Message } from './message'
import type { ToolDefinition } from './tool'
import type { ProviderConfig } from './provider'

export interface RequestOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
  signal?: AbortSignal
}

export interface PipelineInput {
  messages: Message[]
  tools?: ToolDefinition[]
  provider: ProviderConfig
  options?: RequestOptions
}

export interface PipelineOutput {
  messages: Message[]
  tools?: ToolDefinition[]
  provider: ProviderConfig
  options?: RequestOptions
}
