import type { ContentPart, Message, ProviderConfig } from '@tuple-gpt/ai-core'
import type { ApiFormat, ChatMessage, MessageAttachment, MessageRole, Provider } from './types'

export interface ChatRequestMessage {
  role: MessageRole
  content: string
  attachments?: MessageAttachment[]
}

const FORMAT_TO_PROVIDER_TYPE = {
  openai: 'openai',
  claude: 'anthropic',
  gemini: 'gemini',
} as const satisfies Record<ApiFormat, ProviderConfig['type']>

// Stored baseUrl values omit the version prefix; ai-core transports append only
// endpoint paths and expect the version prefix here.
const VERSION_PREFIX: Record<ProviderConfig['type'], string> = {
  openai: '/v1',
  anthropic: '/v1',
  gemini: '/v1beta',
}

export function formatAttachmentsAsContext(attachments: MessageAttachment[]): string {
  const valid = attachments.filter(attachment => attachment.extractedContent)
  if (valid.length === 0) return ''

  const pages = valid
    .map(
      attachment =>
        `<page title="${attachment.title}" url="${attachment.url ?? ''}">\n${attachment.extractedContent}\n</page>`,
    )
    .join('\n\n')

  return `\n\n<attached_pages>\n${pages}\n</attached_pages>`
}

export function buildRequestMessages(history: ChatMessage[]): ChatRequestMessage[] {
  return history.map(message => {
    const context = formatAttachmentsAsContext(message.attachments ?? [])
    return {
      role: message.role,
      content: context ? message.content + context : message.content,
      attachments: message.attachments,
    }
  })
}

export function getBinaryAttachments(attachments?: MessageAttachment[]): MessageAttachment[] {
  return (
    attachments?.filter(
      attachment =>
        (attachment.category === 'image' || attachment.category === 'pdf') && attachment.base64Data,
    ) ?? []
  )
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

export function toMessages(messages: ChatRequestMessage[]): Message[] {
  return messages.map(message => {
    const binaryAttachments = getBinaryAttachments(message.attachments)

    if (binaryAttachments.length === 0) {
      return {
        role: message.role as Message['role'],
        content: message.content,
      }
    }

    const parts: ContentPart[] = []

    if (message.content) {
      parts.push({ type: 'text', text: message.content })
    }

    for (const attachment of binaryAttachments) {
      parts.push({
        type: 'image',
        image: attachment.base64Data!,
        mimeType: attachment.mimeType,
      })
    }

    return {
      role: message.role as Message['role'],
      content: parts,
    }
  })
}
