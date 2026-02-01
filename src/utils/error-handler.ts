/**
 * 统一错误处理中间件
 * 提供一致的错误处理策略和用户反馈机制
 */

import { createLogger } from './logger';
import { useToast } from 'vue-toast-notification';

const logger = createLogger('ErrorHandler');

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS = 'business',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 错误接口
export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string | number;
  context?: any;
  userMessage?: string;
  shouldReport?: boolean;
  shouldShowToast?: boolean;
  retryable?: boolean;
}

// 错误处理配置
export interface ErrorHandlerConfig {
  enableToast: boolean;
  enableLogging: boolean;
  enableReporting: boolean;
  defaultSeverity: ErrorSeverity;
  toastDuration: number;
}

// 默认配置
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableToast: true,
  enableLogging: true,
  enableReporting: true,
  defaultSeverity: ErrorSeverity.MEDIUM,
  toastDuration: 5000,
};

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private toast = useToast();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 处理错误
   */
  handle(error: Error | AppError, context?: string): void {
    const appError = this.normalizeError(error, context);
    
    // 记录日志
    if (this.config.enableLogging) {
      this.logError(appError);
    }

    // 显示用户提示
    if (this.config.enableToast && appError.shouldShowToast !== false) {
      this.showToast(appError);
    }

    // 上报错误
    if (this.config.enableReporting && appError.shouldReport !== false) {
      this.reportError(appError);
    }
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: Error | AppError, context?: string): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    // 根据错误信息推断错误类型
    const type = this.inferErrorType(error);
    const severity = this.inferErrorSeverity(error, type);

    return {
      ...error,
      type,
      severity,
      context,
      userMessage: this.generateUserMessage(error, type),
      shouldReport: severity !== ErrorSeverity.LOW,
      shouldShowToast: true,
      retryable: this.isRetryable(type),
    };
  }

  /**
   * 检查是否为应用错误
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error.type === 'string' && typeof error.severity === 'string';
  }

  /**
   * 推断错误类型
   */
  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorType.AUTHORIZATION;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('api') || message.includes('server')) {
      return ErrorType.API;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * 推断错误严重级别
   */
  private inferErrorSeverity(error: Error, type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      
      case ErrorType.NETWORK:
      case ErrorType.API:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.VALIDATION:
        return ErrorSeverity.LOW;
      
      case ErrorType.SYSTEM:
        return ErrorSeverity.CRITICAL;
      
      default:
        return this.config.defaultSeverity;
    }
  }

  /**
   * 生成用户友好的错误消息
   */
  private generateUserMessage(error: Error, type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return '网络连接失败，请检查网络设置后重试';
      
      case ErrorType.AUTHENTICATION:
        return '身份验证失败，请重新登录';
      
      case ErrorType.AUTHORIZATION:
        return '您没有权限执行此操作';
      
      case ErrorType.VALIDATION:
        return '输入数据格式不正确，请检查后重试';
      
      case ErrorType.API:
        return '服务器响应异常，请稍后重试';
      
      case ErrorType.BUSINESS:
        return error.message || '操作失败，请重试';
      
      default:
        return '发生未知错误，请稍后重试';
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.API,
      ErrorType.SYSTEM,
    ].includes(type);
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      context: error.context,
      stack: error.stack,
      retryable: error.retryable,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`[CRITICAL] ${error.message}`, error, logData);
        break;
      
      case ErrorSeverity.HIGH:
        logger.error(`[HIGH] ${error.message}`, error, logData);
        break;
      
      case ErrorSeverity.MEDIUM:
        logger.warn(`[MEDIUM] ${error.message}`, logData);
        break;
      
      case ErrorSeverity.LOW:
        logger.info(`[LOW] ${error.message}`, logData);
        break;
    }
  }

  /**
   * 显示错误提示
   */
  private showToast(error: AppError): void {
    const message = error.userMessage || error.message;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        this.toast.error(message, { duration: this.config.toastDuration });
        break;
      
      case ErrorSeverity.MEDIUM:
        this.toast.warning(message, { duration: this.config.toastDuration });
        break;
      
      case ErrorSeverity.LOW:
        this.toast.info(message, { duration: this.config.toastDuration });
        break;
    }
  }

  /**
   * 上报错误
   */
  private reportError(error: AppError): void {
    // 这里可以集成错误上报服务，如 Sentry、Bugsnag 等
    if (import.meta.env.DEV) {
      console.group('🚨 Error Report');
      console.error('Error:', error);
      console.log('Context:', error.context);
      console.log('Type:', error.type);
      console.log('Severity:', error.severity);
      console.groupEnd();
    }
    
    // TODO: 集成实际的错误上报服务
    // reportToSentry(error);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();

/**
 * 便捷的错误处理函数
 */
export const handleError = (error: Error | AppError, context?: string): void => {
  errorHandler.handle(error, context);
};

/**
 * 创建应用错误
 */
export const createAppError = (
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options: Partial<AppError> = {}
): AppError => {
  return {
    name: 'AppError',
    message,
    type,
    severity,
    shouldReport: severity !== ErrorSeverity.LOW,
    shouldShowToast: true,
    retryable: [ErrorType.NETWORK, ErrorType.API, ErrorType.SYSTEM].includes(type),
    ...options,
  };
};

/**
 * 网络错误
 */
export const createNetworkError = (message: string = '网络连接失败'): AppError => {
  return createAppError(message, ErrorType.NETWORK, ErrorSeverity.MEDIUM, {
    retryable: true,
  });
};

/**
 * API 错误
 */
export const createApiError = (
  message: string,
  code?: string | number,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): AppError => {
  return createAppError(message, ErrorType.API, severity, {
    code,
    retryable: true,
  });
};

/**
 * 验证错误
 */
export const createValidationError = (message: string, field?: string): AppError => {
  return createAppError(message, ErrorType.VALIDATION, ErrorSeverity.LOW, {
    context: { field },
    retryable: false,
  });
};

/**
 * 业务错误
 */
export const createBusinessError = (message: string): AppError => {
  return createAppError(message, ErrorType.BUSINESS, ErrorSeverity.MEDIUM, {
    retryable: false,
  });
};

// 全局错误处理
window.addEventListener('error', (event) => {
  handleError(event.error, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason, 'Unhandled Promise Rejection');
});
