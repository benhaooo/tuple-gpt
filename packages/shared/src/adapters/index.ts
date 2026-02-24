import type { AIAdapter } from './types'
import type { ApiFormat } from '../types'
import { OpenAIAdapter } from './openai-adapter'
import { ClaudeAdapter } from './claude-adapter'
import { GeminiAdapter } from './gemini-adapter'

export type { AIAdapter, AdapterSendOptions } from './types'
export { OpenAIAdapter } from './openai-adapter'
export { ClaudeAdapter } from './claude-adapter'
export { GeminiAdapter } from './gemini-adapter'

const adapterMap: Record<ApiFormat, new () => AIAdapter> = {
  openai: OpenAIAdapter,
  claude: ClaudeAdapter,
  gemini: GeminiAdapter,
}

export function createAdapter(format: ApiFormat): AIAdapter {
  const AdapterClass = adapterMap[format]
  if (!AdapterClass) {
    throw new Error(`Unsupported API format: ${format}`)
  }
  return new AdapterClass()
}
