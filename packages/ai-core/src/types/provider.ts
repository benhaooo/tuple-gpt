export const ProviderType = {
  OpenAI: 'openai',
  OpenAIResponses: 'openai-responses',
  Anthropic: 'anthropic',
  Gemini: 'gemini',
} as const

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType]

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  /** Extra headers to include in requests */
  headers?: Record<string, string>
  /** Enable native web search when supported by the provider */
  webSearch?: boolean
}
