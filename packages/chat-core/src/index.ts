export type {
  ApiFormat,
  Assistant,
  AttachmentCategory,
  ChatMessage,
  Conversation,
  MessageAttachment,
  MessageRole,
  MessageStatus,
  ModelSelection,
  Provider,
  ProviderPreset,
} from './types'

export {
  addMessage,
  createConversation,
  deleteConversation,
  deleteMessage,
  getActiveConversation,
  renameConversation,
  truncateAfterMessage,
  truncateConversationAfterMessage,
  updateMessageContent,
  updateMessageStatus,
  upsertConversation,
  type CreateConversationInput,
  type IdTimeOptions,
  type MessageInput,
  type ConversationListResult,
} from './conversation'

export {
  buildRequestMessages,
  formatAttachmentsAsContext,
  getBinaryAttachments,
  toMessages,
  toProviderConfig,
  type ChatRequestMessage,
} from './request'

export {
  canPersistEditedMessage,
  normalizeContent,
  prepareRegenerateAssistantMessage,
  prepareResendFromUserMessage,
  prepareSaveUserMessage,
  prepareSendMessage,
  replaceConversation,
  type PrepareMessageResult,
  type PrepareSendMessageInput,
  type PrepareSendMessageResult,
} from './flow'

export {
  streamAssistantReply,
  type ChatRuntimeEvent,
  type StreamAssistantReplyInput,
} from './runtime'

export { getErrorMessage } from './utils/error'

export {
  cloneConversation,
  cloneMessage,
  cloneStorageSnapshot,
  normalizeStorageSnapshot,
  type ActiveChatRequestConfig,
  type ChatSnapshot,
  type ChatSnapshotListener,
  type ChatStorage,
  type ChatStorageSnapshot,
} from './ports'

export {
  createChatRuntime,
  type ChatRuntime,
  type ChatRuntimeOptions,
  type SendMessageInput,
} from './chat-runtime'
