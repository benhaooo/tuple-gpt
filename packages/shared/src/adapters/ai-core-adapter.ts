import type { Provider } from '../types/provider'
import type { MessageAttachment } from '../types/chat'
import type { ProviderConfig, Message, ContentPart } from '@tuple-gpt/ai-core'
import { getBinaryAttachments } from './multimodal'

const FORMAT_TO_PROVIDER_TYPE = {
  openai: 'openai',
  claude: 'anthropic',
  gemini: 'gemini',
} as const

// Old adapters stored baseUrl without version prefix (e.g. "https://api.openai.com")
// and appended "/v1/chat/completions" themselves.
// ai-core transports expect baseUrl to include the version prefix (e.g. "https://api.openai.com/v1")
// and only append the endpoint path ("/chat/completions").
const VERSION_PREFIX: Record<string, string> = {
  openai: '/v1',
  anthropic: '/v1',
  gemini: '/v1beta',
}

export function toProviderConfig(provider: Provider, model: string): ProviderConfig {
  const type = FORMAT_TO_PROVIDER_TYPE[provider.format]
  const base = provider.baseUrl.replace(/\/$/, '')
  const prefix = VERSION_PREFIX[type] ?? ''
  return {
    type,
    apiKey: provider.apiKey,
    baseUrl: `${base}${prefix}`,
    model,
  }
}

export function toMessages(
  messages: Array<{ role: string; content: string; attachments?: MessageAttachment[] }>,
): Message[] {
  return messages.map((msg) => {
    const binaryAttachments = getBinaryAttachments(msg.attachments)

    if (binaryAttachments.length === 0) {
      return { role: msg.role, content: msg.content } as Message
    }

    const parts: ContentPart[] = []

    if (msg.content) {
      parts.push({ type: 'text', text: msg.content })
    }

    for (const att of binaryAttachments) {
      parts.push({
        type: 'image',
        image: att.base64Data!,
        mimeType: att.mimeType,
      })
    }

    return { role: msg.role, content: parts } as Message
  })
}
