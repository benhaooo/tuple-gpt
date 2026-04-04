export type { Transport } from './transport'
export { parseSSE, type SSEEvent } from './sse-parser'
export { createOpenAITransport } from './providers/openai'
export { createAnthropicTransport } from './providers/anthropic'
export { createGeminiTransport } from './providers/gemini'

import type { Transport } from './transport'
import { createOpenAITransport } from './providers/openai'
import { createAnthropicTransport } from './providers/anthropic'
import { createGeminiTransport } from './providers/gemini'

import { ProviderType } from '../types/provider'

export function createTransport(type: ProviderType): Transport {
  switch (type) {
    case ProviderType.OpenAI:
      return createOpenAITransport()
    case ProviderType.Anthropic:
      return createAnthropicTransport()
    case ProviderType.Gemini:
      return createGeminiTransport()
  }
}
