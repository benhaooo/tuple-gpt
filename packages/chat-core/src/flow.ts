import {
  addMessage,
  createConversation,
  truncateConversationAfterMessage,
  updateMessageContent,
  upsertConversation,
  type IdTimeOptions,
} from './conversation'
import type { ChatMessage, Conversation, MessageAttachment } from './types'

export interface PrepareSendMessageInput extends IdTimeOptions {
  activeConversation?: Conversation
  providerId: string
  model: string
  content: string
  attachments?: MessageAttachment[]
}

export interface PrepareSendMessageResult {
  conversation: Conversation
  userMessage: ChatMessage
  requestHistory: ChatMessage[]
  createdConversation: boolean
}

export interface PrepareMessageResult {
  conversation: Conversation
  requestHistory: ChatMessage[]
}

export function normalizeContent(content: string): string {
  return content.trim()
}

export function canPersistEditedMessage(message: ChatMessage, content: string): boolean {
  return normalizeContent(content).length > 0 || (message.attachments?.length ?? 0) > 0
}

export function prepareSendMessage(input: PrepareSendMessageInput): PrepareSendMessageResult {
  const createdConversation = !input.activeConversation
  const conversation =
    input.activeConversation ??
    createConversation({
      providerId: input.providerId,
      model: input.model,
      createId: input.createId,
      now: input.now,
    })

  const historySnapshot = [...conversation.messages]
  const addResult = addMessage(
    conversation,
    {
      role: 'user',
      content: input.content,
      status: 'done',
      attachments: input.attachments?.length ? input.attachments : undefined,
    },
    {
      createId: input.createId,
      now: input.now,
    },
  )

  return {
    conversation: addResult.conversation,
    userMessage: addResult.message,
    requestHistory: [...historySnapshot, addResult.message],
    createdConversation,
  }
}

export function prepareSaveUserMessage(
  conversation: Conversation,
  messageId: string,
  content: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  const message = conversation.messages.find(item => item.id === messageId)
  if (!message || message.role !== 'user') return null
  if (!canPersistEditedMessage(message, content)) return null

  const nextConversations = updateMessageContent(
    [conversation],
    conversation.id,
    messageId,
    normalizeContent(content),
    options,
  )

  return nextConversations[0]
}

export function prepareResendFromUserMessage(
  conversation: Conversation,
  messageId: string,
  content: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): PrepareMessageResult | null {
  const message = conversation.messages.find(item => item.id === messageId)
  if (!message || message.role !== 'user') return null
  if (!canPersistEditedMessage(message, content)) return null

  const withUpdatedContent = prepareSaveUserMessage(conversation, messageId, content, options)
  if (!withUpdatedContent) return null

  const truncated = truncateConversationAfterMessage(withUpdatedContent, messageId, options)
  if (!truncated) return null

  return {
    conversation: truncated,
    requestHistory: [...truncated.messages],
  }
}

export function prepareRegenerateAssistantMessage(
  conversation: Conversation,
  messageId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): PrepareMessageResult | null {
  const index = conversation.messages.findIndex(message => message.id === messageId)
  if (index === -1) return null

  const message = conversation.messages[index]
  if (message.role !== 'assistant') return null

  const anchorUser = [...conversation.messages.slice(0, index)]
    .reverse()
    .find(item => item.role === 'user')
  if (!anchorUser) return null

  const truncated = truncateConversationAfterMessage(conversation, anchorUser.id, options)
  if (!truncated) return null

  return {
    conversation: truncated,
    requestHistory: [...truncated.messages],
  }
}

export function replaceConversation(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return upsertConversation(conversations, conversation)
}
