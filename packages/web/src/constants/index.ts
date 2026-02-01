/**
 * 常量统一导出文件
 * 提供项目中所有常量的统一访问入口
 */

// 应用常量
export * from './app';

// 默认配置
export * from './default';

// 环境变量
export * from './env';

// 常用常量组合导出
export const CONSTANTS = {
  // 从 app.ts 导出的常量
  APP_INFO: {
    NAME: 'Tuple-GPT',
    VERSION: '1.0.0',
    DESCRIPTION: 'AI Chat Application',
    AUTHOR: 'Tuple Team',
  },
  
  // 路由常量
  ROUTES: {
    HOME: '/',
    CHAT: '/chat/message',
    SETTING: '/chat/setting',
    TOOL: '/chat/tool',
  },
  
  // 存储键名
  STORAGE_KEYS: {
    USER_CONFIG: 'tuple-gpt-user-config',
    CHAT_SESSIONS: 'tuple-gpt-chat-sessions',
    API_CONFIG: 'tuple-gpt-api-config',
    MODEL_CONFIG: 'tuple-gpt-model-config',
    THEME: 'tuple-gpt-theme',
    LANGUAGE: 'tuple-gpt-language',
  },
  
  // 默认值
  DEFAULT_VALUES: {
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
  },
} as const;

// 类型导出
export type {
  // 从其他文件导出的类型
} from './app';

// 工具函数
export const UTILS = {
  /**
   * 检查是否为有效的 API 密钥格式
   */
  isValidApiKey: (key: string): boolean => {
    return key.length >= 10 && key.length <= 200 && /^[a-zA-Z0-9\-_]+$/.test(key);
  },
  
  /**
   * 检查是否为有效的 URL
   */
  isValidUrl: (url: string): boolean => {
    return /^https?:\/\/.+/.test(url);
  },
  
  /**
   * 检查是否为有效的模型名称
   */
  isValidModelName: (name: string): boolean => {
    return /^[a-zA-Z0-9\-_.\/]+$/.test(name);
  },
  
  /**
   * 格式化文件大小
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * 生成唯一 ID
   */
  generateId: (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },
  
  /**
   * 延迟函数
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * 防抖函数
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function (this: any, ...args: Parameters<T>): void {
      const context = this;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  },
  
  /**
   * 节流函数
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T, 
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return function (this: any, ...args: Parameters<T>): void {
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * 深拷贝对象
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => UTILS.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = UTILS.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  },
  
  /**
   * 安全的 JSON 解析
   */
  safeJsonParse: <T>(str: string, defaultValue: T): T => {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  },
  
  /**
   * 安全的 JSON 字符串化
   */
  safeJsonStringify: (obj: any, defaultValue: string = '{}'): string => {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  },
} as const;
