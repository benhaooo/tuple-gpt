import type { ChatMessage, Conversation, MessageStatus } from './types'

export interface IdTimeOptions {
  id?: string
  timestamp?: string
  createId?: () => string
  now?: () => string
}

export interface CreateConversationInput extends IdTimeOptions {
  providerId: string
  model: string
  title?: string
}

export type MessageInput = Omit<ChatMessage, 'id' | 'timestamp'> &
  Partial<Pick<ChatMessage, 'id' | 'timestamp'>>

export interface ConversationListResult {
  conversations: Conversation[]
  activeConversationId: string | null
}

function defaultCreateId(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  if (randomUUID) return randomUUID.call(globalThis.crypto)
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function resolveId(options?: IdTimeOptions): string {
  return options?.id ?? options?.createId?.() ?? defaultCreateId()
}

function resolveTimestamp(options?: IdTimeOptions): string {
  return options?.timestamp ?? options?.now?.() ?? new Date().toISOString()
}

function createTitle(content: string): string {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}

export function createConversation(input: CreateConversationInput): Conversation {
  const timestamp = resolveTimestamp(input)
  return {
    id: resolveId(input),
    title: input.title || '新对话',
    messages: [],
    providerId: input.providerId,
    model: input.model,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function getActiveConversation(
  conversations: Conversation[],
  activeConversationId: string | null,
): Conversation | undefined {
  if (!activeConversationId) return undefined
  return conversations.find(c => c.id === activeConversationId)
}

export function addMessage(
  conversation: Conversation,
  message: MessageInput,
  options?: IdTimeOptions,
): { conversation: Conversation; message: ChatMessage } {
  const timestamp = message.timestamp ?? resolveTimestamp(options)
  const fullMessage: ChatMessage = {
    ...message,
    id: message.id ?? resolveId(options),
    timestamp,
  }

  const messages = [...conversation.messages, fullMessage]
  let title = conversation.title

  if (
    title === '新对话' &&
    fullMessage.role === 'user' &&
    messages.filter(m => m.role === 'user').length === 1
  ) {
    title = createTitle(fullMessage.content)
  }

  return {
    message: fullMessage,
    conversation: {
      ...conversation,
      title,
      messages,
      updatedAt: timestamp,
    },
  }
}

export function upsertConversation(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  const index = conversations.findIndex(c => c.id === conversation.id)
  if (index === -1) return [conversation, ...conversations]
  return conversations.map(c => (c.id === conversation.id ? conversation : c))
}

export function deleteConversation(
  conversations: Conversation[],
  activeConversationId: string | null,
  conversationId: string,
): ConversationListResult {
  const nextConversations = conversations.filter(c => c.id !== conversationId)
  const nextActiveConversationId =
    activeConversationId === conversationId
      ? (nextConversations[0]?.id ?? null)
      : activeConversationId

  return {
    conversations: nextConversations,
    activeConversationId: nextActiveConversationId,
  }
}

export function renameConversation(
  conversations: Conversation[],
  conversationId: string,
  title: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return conversations.map(conversation =>
    conversation.id === conversationId
      ? { ...conversation, title, updatedAt: timestamp }
      : conversation,
  )
}

export function updateMessageContent(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  content: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const hasMessage = conversation.messages.some(message => message.id === messageId)
    if (!hasMessage) return conversation

    return {
      ...conversation,
      updatedAt: timestamp,
      messages: conversation.messages.map(message =>
        message.id === messageId ? { ...message, content } : message,
      ),
    }
  })
}

export function updateMessageStatus(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  status: MessageStatus,
  error?: string,
): Conversation[] {
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const hasMessage = conversation.messages.some(message => message.id === messageId)
    if (!hasMessage) return conversation

    return {
      ...conversation,
      messages: conversation.messages.map(message => {
        if (message.id !== messageId) return message
        return {
          ...message,
          status,
          ...(error ? { error } : {}),
        }
      }),
    }
  })
}

export function deleteMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const messages = conversation.messages.filter(message => message.id !== messageId)
    if (messages.length === conversation.messages.length) return conversation

    return {
      ...conversation,
      messages,
      updatedAt: timestamp,
    }
  })
}

export function truncateAfterMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const index = conversation.messages.findIndex(message => message.id === messageId)
    if (index === -1) return conversation

    return {
      ...conversation,
      messages: conversation.messages.slice(0, index + 1),
      updatedAt: timestamp,
    }
  })
}

export function truncateConversationAfterMessage(
  conversation: Conversation,
  messageId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  const index = conversation.messages.findIndex(message => message.id === messageId)
  if (index === -1) return null
  return {
    ...conversation,
    messages: conversation.messages.slice(0, index + 1),
    updatedAt: resolveTimestamp(options),
  }
}
