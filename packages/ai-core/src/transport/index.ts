export type { Transport } from './transport'
export { parseSSE, type SSEEvent } from './sse-parser'
export { createOpenAITransport } from './providers/openai'
export { createOpenAIResponsesTransport } from './providers/openai-responses'
export { createAnthropicTransport } from './providers/anthropic'
export { createGeminiTransport } from './providers/gemini'
export { createGeminiInteractionsTransport } from './providers/gemini-interactions'

import type { Transport } from './transport'
import { createOpenAITransport } from './providers/openai'
import { createOpenAIResponsesTransport } from './providers/openai-responses'
import { createAnthropicTransport } from './providers/anthropic'
import { createGeminiTransport } from './providers/gemini'
import { createGeminiInteractionsTransport } from './providers/gemini-interactions'

import { ProviderType } from '../types/provider'

export function createTransport(type: ProviderType): Transport {
  switch (type) {
    case ProviderType.OpenAI:
      return createOpenAITransport()
    case ProviderType.OpenAIResponses:
      return createOpenAIResponsesTransport()
    case ProviderType.Anthropic:
      return createAnthropicTransport()
    case ProviderType.Gemini:
      return createGeminiTransport()
    case ProviderType.GeminiInteractions:
      return createGeminiInteractionsTransport()
  }

  throw new Error(`Unsupported provider type: ${type}`)
}
