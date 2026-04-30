export type MessageRole = 'system' | 'user' | 'assistant'

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

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
  content: string
  timestamp: string
  status: MessageStatus
  error?: string
  providerId?: string
  attachments?: MessageAttachment[]
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  providerId: string
  model: string
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
