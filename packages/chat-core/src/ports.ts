import type { ChatMessage, Conversation, Provider } from './types'

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
}

export interface ChatSnapshot extends ChatStorageSnapshot {
  activeConversation?: Conversation
  messages: ChatMessage[]
  isReady: boolean
  streamingConversationIds: string[]
  isStreaming: boolean
}

export type ChatSnapshotListener = (snapshot: ChatSnapshot) => void

export function cloneMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    attachments: message.attachments?.map(attachment => ({ ...attachment })),
  }
}

export function cloneConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map(cloneMessage),
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
