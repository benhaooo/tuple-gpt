/**
 * 环境变量管理
 * 统一管理所有环境变量的访问和默认值
 */

// 环境类型
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * 获取当前环境
 */
export function getCurrentEnvironment(): Environment {
  const env = import.meta.env.MODE;
  switch (env) {
    case 'development':
      return Environment.DEVELOPMENT;
    case 'production':
      return Environment.PRODUCTION;
    case 'test':
      return Environment.TEST;
    default:
      return Environment.DEVELOPMENT;
  }
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === Environment.DEVELOPMENT;
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === Environment.PRODUCTION;
}

/**
 * 检查是否为测试环境
 */
export function isTest(): boolean {
  return getCurrentEnvironment() === Environment.TEST;
}

/**
 * 环境变量配置
 */
export const ENV_CONFIG = {
  // 应用基础配置
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Tuple-GPT',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'AI Chat Application',
  
  // API 配置
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  
  // 默认 API 密钥 (仅开发环境)
  DEFAULT_API_KEY: isDevelopment() ? import.meta.env.VITE_DEFAULT_API_KEY || '' : '',
  
  // 代理配置
  PROXY_URL: import.meta.env.VITE_PROXY_URL || 'http://localhost:3111',
  
  // Azure 配置
  AZURE_API_VERSION: import.meta.env.VITE_AZURE_API_VERSION || '2024-04-01-preview',
  
  // 功能开关
  ENABLE_STREAM: import.meta.env.VITE_ENABLE_STREAM !== 'false',
  ENABLE_IMAGE_UPLOAD: import.meta.env.VITE_ENABLE_IMAGE_UPLOAD !== 'false',
  ENABLE_FILE_UPLOAD: import.meta.env.VITE_ENABLE_FILE_UPLOAD !== 'false',
  ENABLE_VOICE_INPUT: import.meta.env.VITE_ENABLE_VOICE_INPUT !== 'false',
  
  // 调试配置
  DEBUG_MODE: isDevelopment() && import.meta.env.VITE_DEBUG_MODE === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || (isDevelopment() ? 'debug' : 'error'),
  
  // 分析和监控
  ENABLE_ANALYTICS: isProduction() && import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID || '',
  
  // 错误报告
  ENABLE_ERROR_REPORTING: isProduction() && import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  ERROR_REPORTING_DSN: import.meta.env.VITE_ERROR_REPORTING_DSN || '',
  
  // 性能配置
  MAX_CONCURRENT_REQUESTS: Number(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS) || 5,
  REQUEST_RETRY_COUNT: Number(import.meta.env.VITE_REQUEST_RETRY_COUNT) || 3,
  
  // 缓存配置
  CACHE_DURATION: Number(import.meta.env.VITE_CACHE_DURATION) || 300000, // 5分钟
  MAX_CACHE_SIZE: Number(import.meta.env.VITE_MAX_CACHE_SIZE) || 100,
  
  // 文件上传配置
  MAX_FILE_SIZE: Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['png', 'jpg', 'jpeg', 'gif'],
  
  // 安全配置
  ENABLE_CSP: isProduction() && import.meta.env.VITE_ENABLE_CSP !== 'false',
  ENABLE_HTTPS_ONLY: isProduction() && import.meta.env.VITE_ENABLE_HTTPS_ONLY !== 'false',
} as const;

/**
 * 验证必需的环境变量
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 在生产环境中验证关键配置
  if (isProduction()) {
    if (!ENV_CONFIG.API_BASE_URL) {
      errors.push('VITE_API_BASE_URL is required in production');
    }
    
    if (ENV_CONFIG.ENABLE_ANALYTICS && !ENV_CONFIG.ANALYTICS_ID) {
      errors.push('VITE_ANALYTICS_ID is required when analytics is enabled');
    }
    
    if (ENV_CONFIG.ENABLE_ERROR_REPORTING && !ENV_CONFIG.ERROR_REPORTING_DSN) {
      errors.push('VITE_ERROR_REPORTING_DSN is required when error reporting is enabled');
    }
  }
  
  // 验证数值类型的环境变量
  if (isNaN(ENV_CONFIG.API_TIMEOUT) || ENV_CONFIG.API_TIMEOUT <= 0) {
    errors.push('VITE_API_TIMEOUT must be a positive number');
  }
  
  if (isNaN(ENV_CONFIG.MAX_CONCURRENT_REQUESTS) || ENV_CONFIG.MAX_CONCURRENT_REQUESTS <= 0) {
    errors.push('VITE_MAX_CONCURRENT_REQUESTS must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 获取环境变量信息（用于调试）
 */
export function getEnvironmentInfo(): Record<string, any> {
  if (!isDevelopment()) {
    return { environment: getCurrentEnvironment() };
  }
  
  return {
    environment: getCurrentEnvironment(),
    config: ENV_CONFIG,
    validation: validateEnvironment(),
  };
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 获取当前日志级别
 */
export function getCurrentLogLevel(): LogLevel {
  const level = ENV_CONFIG.LOG_LEVEL.toLowerCase();
  return Object.values(LogLevel).includes(level as LogLevel) 
    ? (level as LogLevel) 
    : LogLevel.ERROR;
}

/**
 * 检查是否应该记录指定级别的日志
 */
export function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel();
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const currentIndex = levels.indexOf(currentLevel);
  const targetIndex = levels.indexOf(level);
  
  return targetIndex >= currentIndex;
}
