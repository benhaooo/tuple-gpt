export type { Transport } from './transport'
export { parseSSE, type SSEEvent } from './sse-parser'
export { createOpenAITransport } from './providers/openai'
export { createAnthropicTransport } from './providers/anthropic'
export { createGeminiTransport } from './providers/gemini'

import type { Transport } from './transport'
import { createOpenAITransport } from './providers/openai'
import { createAnthropicTransport } from './providers/anthropic'
import { createGeminiTransport } from './providers/gemini'

export function createTransport(type: 'openai' | 'anthropic' | 'gemini'): Transport {
  switch (type) {
    case 'openai':
      return createOpenAITransport()
    case 'anthropic':
      return createAnthropicTransport()
    case 'gemini':
      return createGeminiTransport()
  }
}
