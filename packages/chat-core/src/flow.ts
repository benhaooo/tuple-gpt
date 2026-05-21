import {
  addTurn,
  createConversation,
  createTurn,
  flattenConversationMessages,
  replaceTurn,
  truncateConversationAfterTurn,
  upsertConversation,
  type IdTimeOptions,
} from './conversation'
import { createTextContent, getMessageText } from './content'
import type { ChatMessage, ChatTurn, Conversation, MessageAttachment } from './types'

export interface PrepareSendMessageInput extends IdTimeOptions {
  activeConversation?: Conversation
  providerId: string
  model: string
  content: string
  attachments?: MessageAttachment[]
}

export interface PrepareSendMessageResult {
  conversation: Conversation
  turn: ChatTurn
  userMessage: ChatMessage
  requestHistory: ChatMessage[]
  createdConversation: boolean
}

export interface PrepareTurnResult {
  conversation: Conversation
  turn: ChatTurn
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
      createId: input.createId,
      now: input.now,
    })

  const historySnapshot = flattenConversationMessages(conversation)
  const { turn, userMessage } = createTurn({
    providerId: input.providerId,
    model: input.model,
    content: input.content,
    attachments: input.attachments,
    createId: input.createId,
    now: input.now,
  })
  const nextConversation = addTurn(conversation, turn, { timestamp: turn.startedAt })

  return {
    conversation: nextConversation,
    turn,
    userMessage,
    requestHistory: [...historySnapshot, userMessage],
    createdConversation,
  }
}

export function prepareSaveUserMessage(
  conversation: Conversation,
  turnId: string,
  content: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  const turn = conversation.turns.find(item => item.id === turnId)
  const userMessage = turn?.messages.find(message => message.role === 'user')
  if (!turn || !userMessage) return null
  if (!canPersistEditedMessage(userMessage, content)) return null

  const timestamp = options?.timestamp ?? options?.now?.() ?? new Date().toISOString()
  const updatedTurn: ChatTurn = {
    ...turn,
    messages: turn.messages.map(message =>
      message.id === userMessage.id
        ? {
            ...message,
            content: createTextContent(normalizeContent(content)),
            updatedAt: timestamp,
          }
        : message,
    ),
  }

  return replaceTurnWithoutTruncating(conversation, updatedTurn, timestamp)
}

export function prepareResendTurn(
  conversation: Conversation,
  turnId: string,
  content: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): PrepareTurnResult | null {
  const turn = conversation.turns.find(item => item.id === turnId)
  const userMessage = turn?.messages.find(message => message.role === 'user')
  if (!turn || !userMessage) return null
  if (!canPersistEditedMessage(userMessage, content)) return null

  const timestamp = options?.timestamp ?? options?.now?.() ?? new Date().toISOString()
  const updatedUserMessage: ChatMessage = {
    ...userMessage,
    content: createTextContent(normalizeContent(content)),
    updatedAt: timestamp,
  }
  const updatedTurn: ChatTurn = {
    ...turn,
    status: 'running',
    messages: [updatedUserMessage],
    startedAt: timestamp,
    endedAt: undefined,
    error: undefined,
  }
  const truncated = replaceTurn(conversation, updatedTurn, { timestamp })
  if (!truncated) return null

  return {
    conversation: truncated,
    turn: updatedTurn,
    requestHistory: flattenConversationMessages(truncated),
  }
}

export function prepareRegenerateTurn(
  conversation: Conversation,
  turnId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): PrepareTurnResult | null {
  const turn = conversation.turns.find(item => item.id === turnId)
  const userMessage = turn?.messages.find(message => message.role === 'user')
  if (!turn || !userMessage) return null

  const timestamp = options?.timestamp ?? options?.now?.() ?? new Date().toISOString()
  const updatedTurn: ChatTurn = {
    ...turn,
    status: 'running',
    messages: [userMessage],
    startedAt: timestamp,
    endedAt: undefined,
    error: undefined,
  }
  const truncated = replaceTurn(conversation, updatedTurn, { timestamp })
  if (!truncated) return null

  return {
    conversation: truncated,
    turn: updatedTurn,
    requestHistory: flattenConversationMessages(truncated),
  }
}

export function truncateAfterTurn(
  conversation: Conversation,
  turnId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  return truncateConversationAfterTurn(conversation, turnId, options)
}

export function replaceConversation(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return upsertConversation(conversations, conversation)
}

export function getTurnUserText(turn: ChatTurn): string {
  const userMessage = turn.messages.find(message => message.role === 'user')
  return userMessage ? getMessageText(userMessage) : ''
}

function replaceTurnWithoutTruncating(
  conversation: Conversation,
  turn: ChatTurn,
  updatedAt: string,
): Conversation | null {
  const index = conversation.turns.findIndex(item => item.id === turn.id)
  if (index === -1) return null

  return {
    ...conversation,
    turns: conversation.turns.map(item => (item.id === turn.id ? turn : item)),
    updatedAt,
  }
}
