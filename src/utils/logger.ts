/**
 * 日志工具类
 * 提供统一的日志记录功能
 */

import { LogLevel, getCurrentLogLevel, shouldLog, isDevelopment } from '@/constants/env';

// 日志颜色配置
const LOG_COLORS = {
  [LogLevel.DEBUG]: '#6B7280',   // 灰色
  [LogLevel.INFO]: '#3B82F6',    // 蓝色
  [LogLevel.WARN]: '#F59E0B',    // 黄色
  [LogLevel.ERROR]: '#EF4444',   // 红色
} as const;

// 日志图标配置
const LOG_ICONS = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
} as const;

/**
 * 日志记录器类
 */
export class Logger {
  private context: string;
  private enableConsole: boolean;
  private enableStorage: boolean;
  private maxStorageSize: number;
  private storageKey: string;

  constructor(
    context: string = 'App',
    options: {
      enableConsole?: boolean;
      enableStorage?: boolean;
      maxStorageSize?: number;
      storageKey?: string;
    } = {}
  ) {
    this.context = context;
    this.enableConsole = options.enableConsole ?? true;
    this.enableStorage = options.enableStorage ?? false;
    this.maxStorageSize = options.maxStorageSize ?? 1000;
    this.storageKey = options.storageKey ?? 'tuple-gpt-logs';
  }

  /**
   * 记录调试信息
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * 记录信息
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * 记录警告
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * 记录错误
   */
  error(message: string, error?: Error, ...args: any[]): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined;
    
    this.log(LogLevel.ERROR, message, errorInfo, ...args);
  }

  /**
   * 记录API请求
   */
  apiRequest(method: string, url: string, data?: any): void {
    this.debug(`API Request: ${method} ${url}`, data);
  }

  /**
   * 记录API响应
   */
  apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    this.log(level, `API Response: ${method} ${url} - ${status}`, data);
  }

  /**
   * 记录用户操作
   */
  userAction(action: string, details?: any): void {
    this.info(`User Action: ${action}`, details);
  }

  /**
   * 记录性能指标
   */
  performance(label: string, duration: number, details?: any): void {
    this.debug(`Performance: ${label} - ${duration}ms`, details);
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      args: args.length > 0 ? args : undefined,
    };

    // 控制台输出
    if (this.enableConsole) {
      this.logToConsole(logEntry);
    }

    // 存储日志
    if (this.enableStorage) {
      this.logToStorage(logEntry);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: any): void {
    const { timestamp, level, context, message, args } = entry;
    const color = LOG_COLORS[level];
    const icon = LOG_ICONS[level];
    const time = new Date(timestamp).toLocaleTimeString();

    if (isDevelopment()) {
      // 开发环境使用彩色输出
      const style = `color: ${color}; font-weight: bold;`;
      console.groupCollapsed(`%c${icon} [${time}] ${context}: ${message}`, style);
      
      if (args) {
        args.forEach((arg: any) => {
          if (typeof arg === 'object') {
            console.dir(arg);
          } else {
            console.log(arg);
          }
        });
      }
      
      console.groupEnd();
    } else {
      // 生产环境使用简单输出
      const logMethod = this.getConsoleMethod(level);
      logMethod(`[${time}] ${context}: ${message}`, ...(args || []));
    }
  }

  /**
   * 获取控制台输出方法
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * 存储日志到本地存储
   */
  private logToStorage(entry: any): void {
    try {
      const logs = this.getStoredLogs();
      logs.push(entry);

      // 限制存储大小
      if (logs.length > this.maxStorageSize) {
        logs.splice(0, logs.length - this.maxStorageSize);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  /**
   * 获取存储的日志
   */
  private getStoredLogs(): any[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored logs:', error);
      return [];
    }
  }

  /**
   * 获取所有存储的日志
   */
  getLogs(level?: LogLevel): any[] {
    const logs = this.getStoredLogs();
    return level ? logs.filter(log => log.level === level) : logs;
  }

  /**
   * 清空存储的日志
   */
  clearLogs(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * 导出日志
   */
  exportLogs(): string {
    const logs = this.getStoredLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 创建子日志记录器
   */
  createChild(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, {
      enableConsole: this.enableConsole,
      enableStorage: this.enableStorage,
      maxStorageSize: this.maxStorageSize,
      storageKey: this.storageKey,
    });
  }
}

// 创建默认日志记录器实例
export const logger = new Logger('TupleGPT', {
  enableConsole: true,
  enableStorage: isDevelopment(),
});

// 创建特定模块的日志记录器
export const createLogger = (context: string): Logger => {
  return logger.createChild(context);
};

// 便捷的日志记录函数
export const log = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, error?: Error, ...args: any[]) => logger.error(message, error, ...args),
  api: {
    request: (method: string, url: string, data?: any) => logger.apiRequest(method, url, data),
    response: (method: string, url: string, status: number, data?: any) => logger.apiResponse(method, url, status, data),
  },
  user: (action: string, details?: any) => logger.userAction(action, details),
  perf: (label: string, duration: number, details?: any) => logger.performance(label, duration, details),
};

// 性能测量装饰器
export const measurePerformance = (label?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const perfLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          log.perf(perfLabel, duration);
        });
      } else {
        const duration = performance.now() - start;
        log.perf(perfLabel, duration);
        return result;
      }
    };

    return descriptor;
  };
};
