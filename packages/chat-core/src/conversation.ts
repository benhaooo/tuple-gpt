import { createTextContent, getMessageText } from './content'
import type {
  ChatMessage,
  ChatTurn,
  Conversation,
  MessageContent,
  MessageStatus,
  MessageAttachment,
  TurnStatus,
} from './types'
import type { ToolCallStatus } from '@tuple-gpt/ai-core'

export interface IdTimeOptions {
  id?: string
  timestamp?: string
  createId?: () => string
  now?: () => string
}

export interface CreateConversationInput extends IdTimeOptions {
  title?: string
}

export type MessageInput = Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>>

export interface CreateTurnInput extends IdTimeOptions {
  providerId: string
  model: string
  content: string
  attachments?: MessageAttachment[]
}

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

export function resolveTimestamp(options?: Pick<IdTimeOptions, 'timestamp' | 'now'>): string {
  return options?.timestamp ?? options?.now?.() ?? new Date().toISOString()
}

function createTitle(content: string): string {
  return content.slice(0, 30) + (content.length > 30 ? '...' : '')
}

export function createConversation(input: CreateConversationInput = {}): Conversation {
  const timestamp = resolveTimestamp(input)
  return {
    id: resolveId(input),
    title: input.title || '新对话',
    turns: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createMessage(message: MessageInput, options?: IdTimeOptions): ChatMessage {
  const createdAt = message.createdAt ?? resolveTimestamp(options)
  const updatedAt = message.updatedAt ?? createdAt

  return {
    ...message,
    id: message.id ?? resolveId(options),
    createdAt,
    updatedAt,
  }
}

export function createTurn(input: CreateTurnInput): { turn: ChatTurn; userMessage: ChatMessage } {
  const startedAt = resolveTimestamp(input)
  const userMessage = createMessage(
    {
      role: 'user',
      content: createTextContent(input.content),
      status: 'done',
      attachments: input.attachments?.length ? input.attachments : undefined,
    },
    input,
  )

  return {
    userMessage,
    turn: {
      id: resolveId(input),
      status: 'running',
      providerId: input.providerId,
      model: input.model,
      messages: [userMessage],
      startedAt,
    },
  }
}

export function getActiveConversation(
  conversations: Conversation[],
  activeConversationId: string | null,
): Conversation | undefined {
  if (!activeConversationId) return undefined
  return conversations.find(c => c.id === activeConversationId)
}

export function flattenTurnMessages(turns: ChatTurn[]): ChatMessage[] {
  return turns.flatMap(turn => turn.messages)
}

export function flattenConversationMessages(conversation: Conversation): ChatMessage[] {
  return flattenTurnMessages(conversation.turns)
}

export function addTurn(
  conversation: Conversation,
  turn: ChatTurn,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation {
  const timestamp = resolveTimestamp(options ?? { timestamp: turn.startedAt })
  let title = conversation.title

  if (title === '新对话' && conversation.turns.length === 0) {
    const userMessage = turn.messages.find(message => message.role === 'user')
    const text = userMessage ? getMessageText(userMessage) : ''
    if (text) title = createTitle(text)
  }

  return {
    ...conversation,
    title,
    turns: [...conversation.turns, turn],
    updatedAt: timestamp,
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

export function appendMessageToTurn(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  message: ChatMessage,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options ?? { timestamp: message.updatedAt })
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: [...turn.messages, message],
    }),
    timestamp,
  )
}

export function updateMessageContent(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  messageId: string,
  content: MessageContent[],
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: turn.messages.map(message =>
        message.id === messageId ? { ...message, content, updatedAt: timestamp } : message,
      ),
    }),
    timestamp,
  )
}

export function updateMessageStatus(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  messageId: string,
  status: MessageStatus,
  error?: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: turn.messages.map(message => {
        if (message.id !== messageId) return message
        return {
          ...message,
          status,
          updatedAt: timestamp,
          ...(error ? { error } : {}),
        }
      }),
    }),
    timestamp,
  )
}

export function updateTurnStatus(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  status: TurnStatus,
  error?: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      status,
      endedAt: status === 'running' ? undefined : timestamp,
      error,
    }),
    timestamp,
  )
}

export function deleteTurn(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const turns = conversation.turns.filter(turn => turn.id !== turnId)
    if (turns.length === conversation.turns.length) return conversation

    return {
      ...conversation,
      turns,
      updatedAt: timestamp,
    }
  })
}

export function truncateConversationAfterTurn(
  conversation: Conversation,
  turnId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  const index = conversation.turns.findIndex(turn => turn.id === turnId)
  if (index === -1) return null

  return {
    ...conversation,
    turns: conversation.turns.slice(0, index + 1),
    updatedAt: resolveTimestamp(options),
  }
}

export function replaceTurn(
  conversation: Conversation,
  turn: ChatTurn,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation | null {
  const index = conversation.turns.findIndex(item => item.id === turn.id)
  if (index === -1) return null
  const timestamp = resolveTimestamp(options ?? { timestamp: turn.startedAt })

  return {
    ...conversation,
    turns: [...conversation.turns.slice(0, index), turn],
    updatedAt: timestamp,
  }
}

export function updateToolCallStatus(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  toolCallId: string,
  status: ToolCallStatus,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: turn.messages.map(message => {
        if (message.role !== 'assistant') return message
        let touched = false
        const nextContent = message.content.map(part => {
          if (part.type !== 'tool_call' || part.toolCall.id !== toolCallId) return part
          if (part.status === status) return part
          touched = true
          return { ...part, status }
        })
        return touched ? { ...message, content: nextContent, updatedAt: timestamp } : message
      }),
    }),
    timestamp,
  )
}

export function updateToolCallResult(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  toolCallId: string,
  result: string,
  isError?: boolean,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: turn.messages.map(message => {
        if (message.role !== 'assistant') return message
        let touched = false
        const nextContent = message.content.map(part => {
          if (part.type !== 'tool_call' || part.toolCall.id !== toolCallId) return part
          touched = true
          return {
            ...part,
            result,
            ...(isError ? { isError: true } : {}),
          }
        })
        return touched ? { ...message, content: nextContent, updatedAt: timestamp } : message
      }),
    }),
    timestamp,
  )
}

export function cancelOpenToolCalls(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  options?: Pick<IdTimeOptions, 'timestamp' | 'now'>,
): Conversation[] {
  const timestamp = resolveTimestamp(options)
  return mapTurn(
    conversations,
    conversationId,
    turnId,
    turn => ({
      ...turn,
      messages: turn.messages.map(message => {
        if (message.role !== 'assistant') return message
        let touched = false
        const nextContent = message.content.map(part => {
          if (part.type !== 'tool_call') return part
          if (part.status === 'resolved' || part.status === 'cancelled') return part
          touched = true
          return { ...part, status: 'cancelled' as ToolCallStatus }
        })
        return touched ? { ...message, content: nextContent, updatedAt: timestamp } : message
      }),
    }),
    timestamp,
  )
}

function mapTurn(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  mapper: (turn: ChatTurn) => ChatTurn,
  updatedAt: string,
): Conversation[] {
  return conversations.map(conversation => {
    if (conversation.id !== conversationId) return conversation
    const hasTurn = conversation.turns.some(turn => turn.id === turnId)
    if (!hasTurn) return conversation

    return {
      ...conversation,
      updatedAt,
      turns: conversation.turns.map(turn => (turn.id === turnId ? mapper(turn) : turn)),
    }
  })
}
