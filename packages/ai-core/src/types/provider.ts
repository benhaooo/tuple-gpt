export const ProviderType = {
  OpenAI: 'openai',
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
}
