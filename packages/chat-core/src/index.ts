export type {
  ApiFormat,
  Assistant,
  AttachmentCategory,
  ChatMode,
  ChatMessage,
  ChatTurn,
  Conversation,
  ErrorBlock,
  MessageContent,
  MessageAttachment,
  MessageRole,
  MessageStatus,
  ModelSelection,
  Provider,
  ProviderPreset,
  TurnStatus,
} from './types'

export {
  addTurn,
  appendMessageToTurn,
  cancelOpenToolCalls,
  createMessage,
  createConversation,
  createTurn,
  deleteConversation,
  deleteTurn,
  flattenConversationMessages,
  flattenTurnMessages,
  getActiveConversation,
  renameConversation,
  replaceTurn,
  resolveTimestamp,
  truncateConversationAfterTurn,
  updateMessageContent,
  updateMessageStatus,
  updateToolCallStatus,
  updateTurnStatus,
  upsertConversation,
  type CreateConversationInput,
  type CreateTurnInput,
  type IdTimeOptions,
  type MessageInput,
  type ConversationListResult,
} from './conversation'

export {
  appendTextToContent,
  cloneContent,
  cloneContentPart,
  createTextContent,
  getContentText,
  getMessageText,
} from './content'

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
  getTurnUserText,
  normalizeContent,
  prepareRegenerateTurn,
  prepareResendTurn,
  prepareSaveUserMessage,
  prepareSendMessage,
  replaceConversation,
  truncateAfterTurn,
  type PrepareTurnResult,
  type PrepareSendMessageInput,
  type PrepareSendMessageResult,
} from './flow'

export {
  streamAssistantReply,
  type ChatRuntimeEvent,
  type StreamAssistantReplyInput,
} from './runtime'

export { getErrorMessage } from './utils/error'

export { getAvatarInitial, generateAvatarColor, getAvatarForegroundColor } from './utils/avatar'

export {
  cloneConversation,
  cloneMessage,
  cloneStorageSnapshot,
  cloneTurn,
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

export { PROVIDER_PRESETS, getPresetById } from './config/provider-presets'

export {
  fetchModels,
  validateApiKey,
  type FetchModelsOptions,
  type FetchModelsResult,
} from './services/fetch-models'

export {
  McpClient,
  type McpConnectionStatus,
  type McpServerConfig,
  type McpServerState,
} from './services/mcp-client'

export {
  builtinTools,
  builtinDefinitions,
  registerBuiltinTools,
  type AutoTool,
  type BuiltinTool,
  type InteractiveTool,
} from './builtin-tools'

export { DefaultToolRunner, createToolRunner } from './tool-runner'
