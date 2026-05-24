import type { ContentPart } from '@tuple-gpt/ai-core'

export type TurnStatus = 'running' | 'done' | 'error' | 'aborted'

export type MessageRole = 'user' | 'assistant'

export type MessageStatus = 'streaming' | 'done' | 'error'

export type MessageContent = ContentPart

export type AttachmentCategory = 'text' | 'image' | 'pdf'

export interface MessageAttachment {
  id: number | string
  type: string
  title: string
  url?: string
  icon?: string
  extractedContent?: string
  category?: AttachmentCategory
  mimeType?: string
  base64Data?: string
  fileSize?: number
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: MessageContent[]
  status: MessageStatus
  createdAt: string
  updatedAt: string
  error?: string
  attachments?: MessageAttachment[]
}

export interface ChatTurn {
  id: string
  status: TurnStatus
  providerId: string
  model: string
  messages: ChatMessage[]
  startedAt: string
  endedAt?: string
  error?: string
}

export interface Conversation {
  id: string
  title: string
  turns: ChatTurn[]
  createdAt: string
  updatedAt: string
}

export type ApiFormat = 'openai' | 'claude' | 'gemini'

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  format: ApiFormat
  /** Available model IDs for this provider */
  models: string[]
  /** Links to a preset provider (undefined for custom providers) */
  presetId?: string
  createdAt: string
  updatedAt: string
}

export interface ProviderPreset {
  id: string
  name: string
  format: ApiFormat
  defaultBaseUrl: string
  defaultModels: string[]
}

/** A resolved model selection: which provider + which model */
export interface ModelSelection {
  providerId: string
  model: string
}

/** Alias for backward compatibility with older extension utilities. */
export type Assistant = Provider

export interface ErrorBlock {
  type: 'network' | 'timeout' | 'auth' | 'quota' | 'validation' | 'api' | 'unknown'
  message: string
  details: string
  timestamp: string
  provider: string
  model?: string
  code?: number
  originalError?: any
}
