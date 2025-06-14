/**
 * 服务层类型定义
 */

import type { Session, Message, SendMessageOptions } from '@/stores/types/chat';

// 服务接口基类
export interface BaseService {
  readonly name: string;
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
}

// 聊天服务接口
export interface IChatService extends BaseService {
  sendMessage(text: string, options?: Partial<SendMessageOptions>): Promise<ServiceResult<string>>;
  sendImageMessage(text: string, imageUrl: string, options?: Partial<SendMessageOptions>): Promise<ServiceResult<string>>;
  regenerateResponse(messageId: string): Promise<ServiceResult<string>>;
  stopMessage(messageId: string): Promise<ServiceResult<boolean>>;
  getMessageHistory(sessionId: string, limit?: number): Promise<ServiceResult<Message[]>>;
}

// 会话服务接口
export interface ISessionService extends BaseService {
  createSession(options?: Partial<Session>): Promise<ServiceResult<Session>>;
  deleteSession(sessionId: string): Promise<ServiceResult<boolean>>;
  updateSession(session: Session): Promise<ServiceResult<Session>>;
  getSession(sessionId: string): Promise<ServiceResult<Session | null>>;
  getAllSessions(): Promise<ServiceResult<Session[]>>;
  searchSessions(query: string): Promise<ServiceResult<Session[]>>;
  duplicateSession(sessionId: string): Promise<ServiceResult<Session>>;
  lockSession(sessionId: string, locked: boolean): Promise<ServiceResult<boolean>>;
}

// 消息服务接口
export interface IMessageService extends BaseService {
  createMessage(sessionId: string, message: Partial<Message>): Promise<ServiceResult<Message>>;
  deleteMessage(sessionId: string, messageId: string): Promise<ServiceResult<boolean>>;
  updateMessage(sessionId: string, messageId: string, updates: Partial<Message>): Promise<ServiceResult<Message>>;
  getMessage(sessionId: string, messageId: string): Promise<ServiceResult<Message | null>>;
  getMessages(sessionId: string, options?: MessageQueryOptions): Promise<ServiceResult<Message[]>>;
  searchMessages(sessionId: string, query: string): Promise<ServiceResult<Message[]>>;
}

// 文件服务接口
export interface IFileService extends BaseService {
  uploadFile(file: File): Promise<ServiceResult<FileUploadResult>>;
  deleteFile(fileId: string): Promise<ServiceResult<boolean>>;
  getFileUrl(fileId: string): Promise<ServiceResult<string>>;
  validateFile(file: File): Promise<ServiceResult<FileValidationResult>>;
}

// 导出服务接口
export interface IExportService extends BaseService {
  exportSessions(sessionIds: string[], format: ExportFormat): Promise<ServiceResult<ExportResult>>;
  importSessions(data: any, format: ExportFormat): Promise<ServiceResult<ImportResult>>;
  exportToFile(data: any, filename: string, format: ExportFormat): Promise<ServiceResult<boolean>>;
}

// 服务容器接口
export interface IServiceContainer {
  register<T extends BaseService>(name: string, service: T): void;
  get<T extends BaseService>(name: string): T;
  has(name: string): boolean;
  remove(name: string): boolean;
  clear(): void;
  getAll(): Map<string, BaseService>;
}

// 通用服务结果类型
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, any>;
}

// 服务错误类型
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// 消息查询选项
export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  role?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'created' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

// 文件上传结果
export interface FileUploadResult {
  fileId: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

// 文件验证结果
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    type: string;
    name: string;
  };
}

// 导出格式
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
}

// 导出结果
export interface ExportResult {
  format: ExportFormat;
  data: any;
  filename: string;
  size: number;
  createdAt: Date;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  importedSessions: number;
  importedMessages: number;
  errors: string[];
  warnings: string[];
}

// 服务事件类型
export enum ServiceEventType {
  SERVICE_REGISTERED = 'service:registered',
  SERVICE_REMOVED = 'service:removed',
  SERVICE_ERROR = 'service:error',
  OPERATION_STARTED = 'operation:started',
  OPERATION_COMPLETED = 'operation:completed',
  OPERATION_FAILED = 'operation:failed',
}

// 服务事件
export interface ServiceEvent {
  type: ServiceEventType;
  serviceName: string;
  timestamp: number;
  data?: any;
  error?: ServiceError;
}

// 服务配置
export interface ServiceConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableEvents?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 服务指标
export interface ServiceMetrics {
  operationCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastOperationTime: Date;
  uptime: number;
}

// 批量操作选项
export interface BatchOperationOptions {
  batchSize?: number;
  concurrency?: number;
  stopOnError?: boolean;
  progressCallback?: (progress: BatchProgress) => void;
}

// 批量操作进度
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentItem?: any;
  errors: ServiceError[];
}

// 批量操作结果
export interface BatchOperationResult<T = any> {
  success: boolean;
  results: ServiceResult<T>[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
  errors: ServiceError[];
}

// 缓存选项
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
}

// 分页选项
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页结果
export interface PaginatedResult<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
