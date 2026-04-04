export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'gemini'
  apiKey: string
  baseUrl?: string
  model: string
  /** Extra headers to include in requests */
  headers?: Record<string, string>
}
