import { DEFAULT_VALUES, ThemeMode, UserRole } from './app';

/**
 * 默认模型配置
 */
export const defaultModelConfig = {
    ctxLimit: DEFAULT_VALUES.CONTEXT_LIMIT,
    maxTokens: DEFAULT_VALUES.MAX_TOKENS,
    replyCount: DEFAULT_VALUES.REPLY_COUNT,
    temperature: DEFAULT_VALUES.TEMPERATURE,
    top_p: DEFAULT_VALUES.TOP_P,
    presence_penalty: DEFAULT_VALUES.PRESENCE_PENALTY,
    frequency_penalty: DEFAULT_VALUES.FREQUENCY_PENALTY,
} as const;

/**
 * 默认用户配置
 */
export const defaultUserConfig = {
    avatar: DEFAULT_VALUES.USER_AVATAR,
    name: DEFAULT_VALUES.USER_NAME,
    script: DEFAULT_VALUES.USER_SCRIPT,
    theme: ThemeMode.AUTO,
} as const;

/**
 * 默认会话配置
 */
export const defaultSessionConfig = {
    id: 'default',
    name: DEFAULT_VALUES.SESSION_NAME,
    messages: [],
    type: 'chat',
    ai: [],
    ctxLimit: DEFAULT_VALUES.CONTEXT_LIMIT,
    locked: false,
    role: UserRole.USER,
    model: 'gpt-4o',
} as const;

/**
 * 默认服务器配置
 */
export const defaultServerConfig = {
    vendor: [],
    host: '',
    key: '',
} as const;

/**
 * 默认API配置
 */
export const defaultApiConfig = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
} as const;