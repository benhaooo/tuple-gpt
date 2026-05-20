import type { ToolDefinition, ToolRunner } from '@tuple-gpt/ai-core'
import type { ChatMode, ChatMessage, ChatTurn, Conversation, Provider } from './types'
import { cloneContent } from './content'

export type MaybePromise<T> = T | Promise<T>

export interface ChatStorageSnapshot {
  conversations: Conversation[]
  activeConversationId: string | null
}

export interface ChatStorage {
  load(): MaybePromise<ChatStorageSnapshot | null | undefined>
  save(snapshot: ChatStorageSnapshot): MaybePromise<void>
  subscribe?(listener: (snapshot: ChatStorageSnapshot) => void): () => void
}

export interface ActiveChatRequestConfig {
  provider: Provider
  model: string
  mode?: ChatMode
  tools?: ToolDefinition[]
  toolRunner?: ToolRunner
  maxTurns?: number
}

export interface ChatSnapshot extends ChatStorageSnapshot {
  activeConversation?: Conversation
  turns: ChatTurn[]
  isReady: boolean
  runningTurnIds: string[]
  isStreaming: boolean
}

export type ChatSnapshotListener = (snapshot: ChatSnapshot) => void

export function cloneMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    content: cloneContent(message.content),
    attachments: message.attachments?.map(attachment => ({ ...attachment })),
  }
}

export function cloneTurn(turn: ChatTurn): ChatTurn {
  return {
    ...turn,
    messages: turn.messages.map(cloneMessage),
  }
}

export function cloneConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    turns: conversation.turns.map(cloneTurn),
  }
}

export function cloneStorageSnapshot(snapshot: ChatStorageSnapshot): ChatStorageSnapshot {
  return {
    conversations: snapshot.conversations.map(cloneConversation),
    activeConversationId: snapshot.activeConversationId,
  }
}

export function normalizeStorageSnapshot(
  snapshot?: Partial<ChatStorageSnapshot> | null,
): ChatStorageSnapshot {
  const conversations = snapshot?.conversations?.map(cloneConversation) ?? []
  const requestedActiveId = snapshot?.activeConversationId ?? null
  const activeConversationId =
    requestedActiveId && conversations.some(conversation => conversation.id === requestedActiveId)
      ? requestedActiveId
      : (conversations[0]?.id ?? null)

  return {
    conversations,
    activeConversationId,
  }
}
