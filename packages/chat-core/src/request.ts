import { ProviderType, type Message, type ProviderConfig } from '@tuple-gpt/ai-core'
import { cloneContent } from './content'
import type { ChatMessage, MessageAttachment, MessageContent, MessageRole, Provider } from './types'

export interface ChatRequestMessage {
  role: MessageRole
  content: MessageContent[]
  attachments?: MessageAttachment[]
}

// Stored baseUrl values omit the version prefix; ai-core transports append only
// endpoint paths and expect the version prefix here.
const VERSION_PREFIX: Record<ProviderConfig['type'], string> = {
  [ProviderType.OpenAI]: '/v1',
  [ProviderType.OpenAIResponses]: '/v1',
  [ProviderType.Anthropic]: '/v1',
  [ProviderType.Gemini]: '/v1beta',
  [ProviderType.GeminiInteractions]: '/v1beta',
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
  const type = toProviderType(provider)
  const base = provider.baseUrl.replace(/\/$/, '')
  const prefix = VERSION_PREFIX[type]
  return {
    type,
    apiKey: provider.apiKey,
    baseUrl: `${base}${prefix}`,
    model,
    webSearch: true,
    reasoning: true,
  }
}

function toProviderType(provider: Provider): ProviderConfig['type'] {
  if (provider.format === ProviderType.OpenAI && provider.useAgentApi) {
    return ProviderType.OpenAIResponses
  }
  if (provider.format === ProviderType.Gemini && provider.useAgentApi) {
    return ProviderType.GeminiInteractions
  }

  return provider.format
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
      content,
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
