/**
 * 应用级常量定义
 */

// 应用信息
export const APP_INFO = {
  NAME: 'Tuple-GPT',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI Chat Application',
  AUTHOR: 'Tuple Team',
} as const;

// 主题相关常量
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

// 用户角色常量
export enum UserRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// 会话类型常量
export enum SessionType {
  CHAT = 'chat',
  AUTO = 'auto',
}

// 消息状态常量
export enum MessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SUCCESS = 'success',
  ERROR = 'error',
}

// 文件类型常量
export const FILE_TYPES = {
  IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'md'],
  AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
  VIDEO: ['mp4', 'avi', 'mov', 'wmv'],
} as const;

// 文件大小限制 (bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,      // 10MB
  DOCUMENT: 50 * 1024 * 1024,   // 50MB
  AUDIO: 100 * 1024 * 1024,     // 100MB
  VIDEO: 500 * 1024 * 1024,     // 500MB
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  USER_CONFIG: 'tuple-gpt-user-config',
  CHAT_SESSIONS: 'tuple-gpt-chat-sessions',
  API_CONFIG: 'tuple-gpt-api-config',
  MODEL_CONFIG: 'tuple-gpt-model-config',
  THEME: 'tuple-gpt-theme',
  LANGUAGE: 'tuple-gpt-language',
} as const;

// 路由路径常量
export const ROUTES = {
  HOME: '/',
  CHAT: '/chat/message',
  SETTING: '/chat/setting',
  TOOL: '/chat/tool',
} as const;

// 默认配置值
export const DEFAULT_VALUES = {
  SESSION_NAME: 'New Chat',
  USER_NAME: '用户',
  USER_AVATAR: '',
  USER_SCRIPT: '一条咸鱼',
  CONTEXT_LIMIT: 5,
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.5,
  TOP_P: 1,
  PRESENCE_PENALTY: 0,
  FREQUENCY_PENALTY: 0,
  REPLY_COUNT: 1,
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  API_KEY_INVALID: 'API 密钥无效，请检查配置',
  MODEL_NOT_FOUND: '模型不存在或不可用',
  RATE_LIMIT_EXCEEDED: '请求频率过高，请稍后再试',
  INSUFFICIENT_QUOTA: '配额不足，请检查账户余额',
  INVALID_REQUEST: '请求参数无效',
  SERVER_ERROR: '服务器内部错误',
  TIMEOUT_ERROR: '请求超时，请重试',
  UNKNOWN_ERROR: '未知错误，请联系技术支持',
} as const;

// 成功消息常量
export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: '配置保存成功',
  SESSION_CREATED: '会话创建成功',
  SESSION_DELETED: '会话删除成功',
  MESSAGE_SENT: '消息发送成功',
  FILE_UPLOADED: '文件上传成功',
  EXPORT_SUCCESS: '导出成功',
  IMPORT_SUCCESS: '导入成功',
} as const;

// 验证规则常量
export const VALIDATION_RULES = {
  API_KEY_MIN_LENGTH: 10,
  API_KEY_MAX_LENGTH: 200,
  SESSION_NAME_MAX_LENGTH: 100,
  MESSAGE_MAX_LENGTH: 10000,
  SYSTEM_PROMPT_MAX_LENGTH: 5000,
} as const;

// 动画持续时间常量 (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// 分页常量
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
} as const;

// 正则表达式常量
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  API_KEY: /^[a-zA-Z0-9\-_]+$/,
  MODEL_NAME: /^[a-zA-Z0-9\-_.\/]+$/,
} as const;

// 快捷键常量
export const KEYBOARD_SHORTCUTS = {
  SEND_MESSAGE: 'Enter',
  NEW_LINE: 'Shift+Enter',
  NEW_SESSION: 'Ctrl+N',
  SAVE_SESSION: 'Ctrl+S',
  SEARCH: 'Ctrl+F',
  SETTINGS: 'Ctrl+,',
} as const;

// 颜色主题常量
export const COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#388e3c',
  WARNING: '#f57c00',
  ERROR: '#d32f2f',
  INFO: '#1976d2',
} as const;

// 图标常量
export const ICONS = {
  CHAT: 'chat',
  SETTINGS: 'settings',
  USER: 'user',
  ROBOT: 'robot',
  SEND: 'send',
  COPY: 'copy',
  DELETE: 'delete',
  EDIT: 'edit',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
} as const;

// 模型能力标识
export enum ModelCapability {
  TEXT = 0,           // 文本生成
  IMAGE = 1,          // 图像理解
  REASONING = 2,      // 推理能力
  CODE = 3,           // 代码生成
  FUNCTION_CALL = 4,  // 函数调用
}

// 模型能力描述
export const MODEL_CAPABILITY_DESCRIPTIONS = {
  [ModelCapability.TEXT]: '文本生成',
  [ModelCapability.IMAGE]: '图像理解',
  [ModelCapability.REASONING]: '推理能力',
  [ModelCapability.CODE]: '代码生成',
  [ModelCapability.FUNCTION_CALL]: '函数调用',
} as const;
