/**
 * 工具函数统一导出文件
 * 提供项目中所有工具函数的统一访问入口
 */

// 通用工具函数
export * from './commonUtils';

// 日志工具
export * from './logger';

// 滚动工具 (重新导出，保持向后兼容)
export * from './scrollUtil';

// 工具函数分类导出
export const Utils = {
  // ID 生成
  id: {
    generate: () => import('./commonUtils').then(m => m.generateUniqueId()),
    uuid: () => import('./commonUtils').then(m => m.generateUUID()),
    short: () => import('./commonUtils').then(m => m.generateShortId()),
  },

  // 时间处理
  time: {
    delay: (ms: number) => import('./commonUtils').then(m => m.delay(ms)),
    format: (timestamp: number, format?: string) => 
      import('./commonUtils').then(m => m.formatTimestamp(timestamp, format)),
    relative: (timestamp: number) => 
      import('./commonUtils').then(m => m.getRelativeTime(timestamp)),
  },

  // 剪贴板操作
  clipboard: {
    copy: (text: string) => import('./commonUtils').then(m => m.copyToClipboard(text)),
    read: () => import('./commonUtils').then(m => m.readFromClipboard()),
  },

  // 对象操作
  object: {
    clone: <T>(obj: T) => import('./commonUtils').then(m => m.deepClone(obj)),
    merge: <T>(target: T, ...sources: Partial<T>[]) => 
      import('./commonUtils').then(m => m.deepMerge(target, ...sources)),
    get: <T>(obj: any, path: string, defaultValue?: T) => 
      import('./commonUtils').then(m => m.getNestedValue(obj, path, defaultValue)),
    set: (obj: any, path: string, value: any) => 
      import('./commonUtils').then(m => m.setNestedValue(obj, path, value)),
  },

  // 数组操作
  array: {
    unique: <T>(array: T[], keyFn?: (item: T) => any) => 
      import('./commonUtils').then(m => m.uniqueArray(array, keyFn)),
    group: <T, K extends string | number>(array: T[], keyFn: (item: T) => K) => 
      import('./commonUtils').then(m => m.groupBy(array, keyFn)),
  },

  // 字符串操作
  string: {
    capitalize: (str: string) => import('./commonUtils').then(m => m.capitalize(str)),
    camelCase: (str: string) => import('./commonUtils').then(m => m.toCamelCase(str)),
    kebabCase: (str: string) => import('./commonUtils').then(m => m.toKebabCase(str)),
    snakeCase: (str: string) => import('./commonUtils').then(m => m.toSnakeCase(str)),
    truncate: (str: string, length: number, suffix?: string) => 
      import('./commonUtils').then(m => m.truncate(str, length, suffix)),
    stripHtml: (html: string) => import('./commonUtils').then(m => m.stripHtml(html)),
    escapeHtml: (str: string) => import('./commonUtils').then(m => m.escapeHtml(str)),
  },

  // 数值操作
  number: {
    format: (num: number, options?: Intl.NumberFormatOptions) => 
      import('./commonUtils').then(m => m.formatNumber(num, options)),
    random: (min: number, max: number, integer?: boolean) => 
      import('./commonUtils').then(m => m.randomNumber(min, max, integer)),
    clamp: (value: number, min: number, max: number) => 
      import('./commonUtils').then(m => m.clamp(value, min, max)),
    fileSize: (bytes: number, decimals?: number) => 
      import('./commonUtils').then(m => m.formatFileSize(bytes, decimals)),
  },

  // 验证函数
  validate: {
    email: (email: string) => import('./commonUtils').then(m => m.isValidEmail(email)),
    url: (url: string) => import('./commonUtils').then(m => m.isValidUrl(url)),
    apiKey: (apiKey: string) => import('./commonUtils').then(m => m.isValidApiKey(apiKey)),
    modelName: (modelName: string) => import('./commonUtils').then(m => m.isValidModelName(modelName)),
    empty: (value: any) => import('./commonUtils').then(m => m.isEmpty(value)),
  },

  // 存储操作
  storage: {
    set: (key: string, value: any) => import('./commonUtils').then(m => m.setLocalStorage(key, value)),
    get: <T>(key: string, defaultValue: T) => 
      import('./commonUtils').then(m => m.getLocalStorage(key, defaultValue)),
    remove: (key: string) => import('./commonUtils').then(m => m.removeLocalStorage(key)),
    clear: () => import('./commonUtils').then(m => m.clearLocalStorage()),
  },

  // 函数式编程
  functional: {
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean) => 
      import('./commonUtils').then(m => m.debounce(func, wait, immediate)),
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => 
      import('./commonUtils').then(m => m.throttle(func, limit)),
    memoize: <T extends (...args: any[]) => any>(func: T, keyGenerator?: (...args: Parameters<T>) => string) => 
      import('./commonUtils').then(m => m.memoize(func, keyGenerator)),
  },

  // 错误处理
  error: {
    safeJsonParse: <T>(str: string, defaultValue: T) => 
      import('./commonUtils').then(m => m.safeJsonParse(str, defaultValue)),
    safeJsonStringify: (obj: any, defaultValue?: string) => 
      import('./commonUtils').then(m => m.safeJsonStringify(obj, defaultValue)),
    safeExecute: <T>(fn: () => T, defaultValue: T, context?: any) => 
      import('./commonUtils').then(m => m.safeExecute(fn, defaultValue, context)),
    retry: <T>(fn: () => Promise<T>, retries?: number, delay?: number) => 
      import('./commonUtils').then(m => m.retryAsync(fn, retries, delay)),
  },

  // 性能优化
  performance: {
    singleton: <T>(constructor: new (...args: any[]) => T) => 
      import('./commonUtils').then(m => m.createSingleton(constructor)),
    lazy: <T>(factory: () => T) => import('./commonUtils').then(m => m.lazy(factory)),
  },

  // 日志记录
  log: {
    create: (context: string) => import('./logger').then(m => m.createLogger(context)),
    debug: (message: string, ...args: any[]) => import('./logger').then(m => m.log.debug(message, ...args)),
    info: (message: string, ...args: any[]) => import('./logger').then(m => m.log.info(message, ...args)),
    warn: (message: string, ...args: any[]) => import('./logger').then(m => m.log.warn(message, ...args)),
    error: (message: string, error?: Error, ...args: any[]) => 
      import('./logger').then(m => m.log.error(message, error, ...args)),
  },
} as const;

// 类型导出
export type {
  // 可以在这里导出工具函数相关的类型
} from './commonUtils';

export type {
  Logger,
} from './logger';

// 便捷的工具函数别名
export const {
  // ID 生成
  generateUniqueId,
  generateUUID,
  generateShortId,

  // 时间处理
  delay,
  formatTimestamp,
  getRelativeTime,

  // 剪贴板
  copyToClipboard,
  readFromClipboard,

  // 对象操作
  deepClone,
  deepMerge,
  getNestedValue,
  setNestedValue,

  // 数组操作
  uniqueArray,
  groupBy,

  // 字符串操作
  capitalize,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  truncate,
  stripHtml,
  escapeHtml,

  // 数值操作
  formatNumber,
  formatFileSize,
  randomNumber,
  clamp,

  // 验证函数
  isValidEmail,
  isValidUrl,
  isValidApiKey,
  isValidModelName,
  isEmpty,

  // 存储操作
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  clearLocalStorage,

  // 函数式编程
  debounce,
  throttle,
  memoize,

  // 错误处理
  safeJsonParse,
  safeJsonStringify,
  safeExecute,
  retryAsync,

  // 性能优化
  createSingleton,
  lazy,

  // 向后兼容
  copyToClip,
} = await import('./commonUtils');

export const {
  logger,
  createLogger,
  log,
  measurePerformance,
} = await import('./logger');
