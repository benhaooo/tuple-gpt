import type { ChatMessage, Provider } from '../types'

export interface AdapterSendOptions {
  messages: ChatMessage[]
  provider: Provider
  /** The specific model ID to use */
  model: string
  signal?: AbortSignal
  systemPrompt?: string
  maxTokens?: number
}

export interface AIAdapter {
  sendMessage(options: AdapterSendOptions): AsyncGenerator<string, void, unknown>
}
