import type { ContentPart, Message, ProviderConfig } from '@tuple-gpt/ai-core'
import { cloneContent } from './content'
import type {
  ApiFormat,
  ChatMessage,
  MessageAttachment,
  MessageContent,
  MessageRole,
  Provider,
} from './types'

export interface ChatRequestMessage {
  role: MessageRole
  content: MessageContent[]
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
      content: appendAttachmentContext(message.content, context),
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
    const content = cloneContent(message.content)

    for (const attachment of binaryAttachments) {
      content.push({
        type: 'image',
        image: attachment.base64Data!,
        mimeType: attachment.mimeType,
      })
    }

    return {
      role: message.role as Message['role'],
      content: normalizeAiContent(content),
    }
  })
}

function appendAttachmentContext(content: MessageContent[], context: string): MessageContent[] {
  const next = cloneContent(content)
  if (!context) return next

  const textIndex = next.findIndex(part => part.type === 'text')
  if (textIndex === -1) {
    return [{ type: 'text', text: context }, ...next]
  }

  return next.map((part, index) =>
    index === textIndex && part.type === 'text' ? { ...part, text: part.text + context } : part,
  )
}

function normalizeAiContent(content: ContentPart[]): Message['content'] {
  if (content.length === 1 && content[0]?.type === 'text') {
    return content[0].text
  }

  return content
}
