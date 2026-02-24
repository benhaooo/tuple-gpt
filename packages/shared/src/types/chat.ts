export type MessageRole = 'system' | 'user' | 'assistant'

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  status: MessageStatus
  error?: string
  providerId?: string
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
