/**
 * Composables 类型定义
 */

import type { Ref } from 'vue';
import type { Session, Message, SendMessageOptions } from '@/stores/types/chat';

// 聊天 composable 返回类型
export interface UseChatReturn {
  // 状态
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  
  // 方法
  sendMessage: (text: string, options?: Partial<SendMessageOptions>) => Promise<void>;
  sendImageMessage: (text: string, imageUrl: string, options?: Partial<SendMessageOptions>) => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
  stopMessage: (messageId: string) => Promise<void>;
  clearError: () => void;
}

// 会话 composable 返回类型
export interface UseSessionReturn {
  // 状态
  sessions: Ref<Session[]>;
  currentSession: Ref<Session | undefined>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  
  // 方法
  createSession: (options?: Partial<Session>) => Promise<Session | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  updateSession: (session: Session) => Promise<boolean>;
  switchSession: (sessionId: string) => Promise<boolean>;
  duplicateSession: (sessionId: string) => Promise<Session | null>;
  searchSessions: (query: string) => Session[];
  clearError: () => void;
}

// 消息 composable 返回类型
export interface UseMessageReturn {
  // 状态
  messages: Ref<Message[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  
  // 方法
  createMessage: (message: Partial<Message>) => Promise<Message | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  updateMessage: (messageId: string, updates: Partial<Message>) => Promise<boolean>;
  searchMessages: (query: string) => Message[];
  clearError: () => void;
}

// 对话框 composable 返回类型
export interface UseDialogReturn {
  // 状态
  isVisible: Ref<boolean>;
  title: Ref<string>;
  content: Ref<string>;
  
  // 方法
  show: (title: string, content: string) => void;
  hide: () => void;
  confirm: (title: string, content: string) => Promise<boolean>;
  alert: (title: string, content: string) => Promise<void>;
}

// Toast 消息 composable 返回类型
export interface UseToastReturn {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

// Toast 选项
export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  showClose?: boolean;
}

// 加载状态 composable 返回类型
export interface UseLoadingReturn {
  isLoading: Ref<boolean>;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

// 剪贴板 composable 返回类型
export interface UseClipboardReturn {
  isSupported: Ref<boolean>;
  text: Ref<string>;
  copy: (text: string) => Promise<boolean>;
  read: () => Promise<string>;
}

// 防抖 composable 返回类型
export interface UseDebounceReturn<T extends (...args: any[]) => any> {
  debouncedFn: T;
  cancel: () => void;
  flush: () => void;
}

// 节流 composable 返回类型
export interface UseThrottleReturn<T extends (...args: any[]) => any> {
  throttledFn: T;
  cancel: () => void;
}

// 本地存储 composable 返回类型
export interface UseLocalStorageReturn<T> {
  value: Ref<T>;
  setValue: (newValue: T) => void;
  removeValue: () => void;
}

// 事件监听器 composable 返回类型
export interface UseEventListenerReturn {
  addEventListener: <K extends keyof WindowEventMap>(
    event: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ) => void;
  removeEventListener: <K extends keyof WindowEventMap>(
    event: K,
    handler: (event: WindowEventMap[K]) => void
  ) => void;
  removeAllListeners: () => void;
}

// 文件上传 composable 返回类型
export interface UseFileUploadReturn {
  // 状态
  isUploading: Ref<boolean>;
  progress: Ref<number>;
  error: Ref<string | null>;
  uploadedFiles: Ref<UploadedFile[]>;
  
  // 方法
  uploadFile: (file: File) => Promise<UploadedFile | null>;
  uploadFiles: (files: File[]) => Promise<UploadedFile[]>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  validateFile: (file: File) => FileValidationResult;
}

// 上传文件信息
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

// 文件验证结果
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 导出 composable 返回类型
export interface UseExportReturn {
  // 状态
  isExporting: Ref<boolean>;
  progress: Ref<number>;
  error: Ref<string | null>;
  
  // 方法
  exportSessions: (sessionIds: string[], format: ExportFormat) => Promise<boolean>;
  exportCurrentSession: (format: ExportFormat) => Promise<boolean>;
  importSessions: (file: File) => Promise<boolean>;
}

// 导出格式
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown',
  HTML = 'html',
}

// 搜索 composable 返回类型
export interface UseSearchReturn<T> {
  // 状态
  query: Ref<string>;
  results: Ref<T[]>;
  isSearching: Ref<boolean>;
  totalResults: Ref<number>;
  
  // 方法
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  setQuery: (query: string) => void;
}

// 搜索选项
export interface SearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  caseSensitive?: boolean;
}

// 分页选项
export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

// 分页 composable 返回类型
export interface UsePaginationReturn {
  // 状态
  currentPage: Ref<number>;
  pageSize: Ref<number>;
  total: Ref<number>;
  totalPages: Ref<number>;
  hasNext: Ref<boolean>;
  hasPrev: Ref<boolean>;
  
  // 方法
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
}

// 表单验证 composable 返回类型
export interface UseFormValidationReturn<T> {
  // 状态
  values: Ref<T>;
  errors: Ref<Record<keyof T, string>>;
  isValid: Ref<boolean>;
  isDirty: Ref<boolean>;
  
  // 方法
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

// 验证规则
export interface ValidationRule<T = any> {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  message?: string;
}

// 表单字段配置
export interface FormFieldConfig<T = any> {
  rules?: ValidationRule<T>[];
  defaultValue?: T;
  transform?: (value: any) => T;
}
