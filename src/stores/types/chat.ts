/**
 * 聊天相关的类型定义
 */

// 消息内容类型
export interface MessageContent {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
}

// 多内容项
export interface MultiContent {
  id: string;
  content: string;
  reasoning_content?: string;
  chatting?: boolean | any;
  model?: string;
  usage?: any;
}

// 消息接口
export interface Message {
  id: string;
  role: string;
  content?: string;
  img?: string;
  multiContent?: MultiContent[];
  selectedContent?: number;
  chatting?: boolean | any;
}

// 会话接口
export interface Session {
  id: string;
  name: string;
  messages: Message[];
  type: string;
  ai: Session[];
  ctxLimit: number;
  locked: boolean;
  role: string;
  model: string;
  format?: string;
  system?: string;
  chatting?: number;
  replyCount?: number;
  clearedCtx?: Message[];
  [key: string]: any; // 允许其他属性
}

// 系统消息接口
export interface SystemMessage {
  role: string;
  content: string;
}

// 消息数据接口
export interface MessageData {
  model: string;
  messages: any[];
  stream?: boolean;
  [key: string]: any;
}

// 发送消息选项
export interface SendMessageOptions {
  text: string;
  imgUrl?: string;
  num?: number;
  formatter?: string;
  empowerThink?: boolean;
  selectedModels?: string[];
}

// 会话存储状态
export interface SessionStore {
  sessions: Session[];
  currentSessionId: string;
}

// 消息存储状态
export interface MessageStore {
  processingMessages: Set<string>;
  streamControllers: Map<string, any>;
}

// 评估存储状态
export interface EvaluationStore {
  evaluationQueue: string[];
  isEvaluating: boolean;
}

// 流式响应选项
export interface StreamOptions {
  onlyThink?: boolean;
}

// 历史消息项
export interface HistoryMessage {
  role: string;
  content: string;
}

// 会话创建选项
export interface SessionCreateOptions extends Partial<Session> {
  // 可以添加特定的创建选项
}

// 消息处理结果
export interface MessageProcessResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// 评估结果
export interface EvaluationResult {
  sessionId: string;
  title: string;
  success: boolean;
  error?: string;
}

// 导入导出数据格式
export interface ChatExportData {
  version: string;
  timestamp: number;
  sessions: Session[];
  metadata?: {
    totalSessions: number;
    totalMessages: number;
    exportedBy: string;
  };
}

// 上下文清理选项
export interface ContextClearOptions {
  keepSystemMessage?: boolean;
  keepLastN?: number;
}

// 自动聊天配置
export interface AutoChatConfig {
  enabled: boolean;
  maxRounds: number;
  delay: number;
  stopOnError: boolean;
}

// 消息统计信息
export interface MessageStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  averageLength: number;
}

// 会话统计信息
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  lockedSessions: number;
  averageMessagesPerSession: number;
  oldestSession: Date;
  newestSession: Date;
}

// 事件类型
export enum ChatEventType {
  SESSION_CREATED = 'session:created',
  SESSION_DELETED = 'session:deleted',
  SESSION_UPDATED = 'session:updated',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_DELETED = 'message:deleted',
  STREAM_STARTED = 'stream:started',
  STREAM_CHUNK = 'stream:chunk',
  STREAM_ENDED = 'stream:ended',
  EVALUATION_STARTED = 'evaluation:started',
  EVALUATION_COMPLETED = 'evaluation:completed',
}

// 事件数据
export interface ChatEvent {
  type: ChatEventType;
  timestamp: number;
  data: any;
  sessionId?: string;
  messageId?: string;
}

// 错误类型
export enum ChatErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  STREAM_ERROR = 'stream_error',
  EVALUATION_ERROR = 'evaluation_error',
  IMPORT_ERROR = 'import_error',
  EXPORT_ERROR = 'export_error',
}

// 聊天错误
export interface ChatError extends Error {
  type: ChatErrorType;
  sessionId?: string;
  messageId?: string;
  details?: any;
}

// 性能指标
export interface PerformanceMetrics {
  messageProcessingTime: number;
  streamLatency: number;
  evaluationTime: number;
  apiResponseTime: number;
}

// 配置选项
export interface ChatConfig {
  autoEvaluation: boolean;
  streamEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
  evaluationModel: string;
  thinkModel: string;
  defaultModel: string;
  contextLimit: number;
  autoSave: boolean;
  autoSaveInterval: number;
}
