/**
 * 通用工具函数库
 * 提供项目中常用的工具函数
 */

import { VALIDATION_RULES, REGEX_PATTERNS } from '@/constants';

// ==================== ID 生成相关 ====================

/**
 * 生成唯一ID
 * @returns 唯一标识符
 */
export const generateUniqueId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * 生成UUID v4
 * @returns UUID v4 格式的字符串
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * 生成短ID (8位)
 * @returns 8位短ID
 */
export const generateShortId = (): string => {
    return Math.random().toString(36).substring(2, 10);
};

// ==================== 时间相关 ====================

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 格式化时间戳
 * @param timestamp 时间戳
 * @param format 格式字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
};

/**
 * 获取相对时间描述
 * @param timestamp 时间戳
 * @returns 相对时间描述
 */
export const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return formatTimestamp(timestamp, 'MM-DD');
};

// ==================== 剪贴板相关 ====================

/**
 * 复制文本到剪贴板 (现代浏览器)
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案
            return await copyToClipboardFallback(text);
        }
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        return false;
    }
};

/**
 * 复制到剪贴板的降级方案
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否成功
 */
const copyToClipboardFallback = (text: string): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.pointerEvents = 'none';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            resolve(success);
        } catch (error) {
            console.error('降级复制方案失败:', error);
            resolve(false);
        }
    });
};

/**
 * 从剪贴板读取文本
 * @returns Promise<string> 剪贴板内容
 */
export const readFromClipboard = async (): Promise<string> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            return await navigator.clipboard.readText();
        }
        throw new Error('Clipboard API not available');
    } catch (error) {
        console.error('从剪贴板读取失败:', error);
        return '';
    }
};

// ==================== 函数式编程工具 ====================

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间(ms)
 * @param immediate 是否立即执行
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 限制时间(ms)
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
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
};

/**
 * 记忆化函数
 * @param func 要记忆化的函数
 * @param keyGenerator 键生成器
 * @returns 记忆化后的函数
 */
export const memoize = <T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T => {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func(...args);
        cache.set(key, result);
        return result;
    }) as T;
};

// ==================== 对象和数组操作 ====================

/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 深拷贝后的对象
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
    if (typeof obj === 'object') {
        const clonedObj = {} as any;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
};

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export const deepMerge = <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
};

/**
 * 检查是否为对象
 * @param item 要检查的项
 * @returns 是否为对象
 */
const isObject = (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * 获取对象的嵌套属性值
 * @param obj 对象
 * @param path 属性路径，如 'a.b.c'
 * @param defaultValue 默认值
 * @returns 属性值
 */
export const getNestedValue = <T = any>(obj: any, path: string, defaultValue?: T): T => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result == null || typeof result !== 'object') {
            return defaultValue as T;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue as T;
};

/**
 * 设置对象的嵌套属性值
 * @param obj 对象
 * @param path 属性路径，如 'a.b.c'
 * @param value 要设置的值
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
};

/**
 * 数组去重
 * @param array 数组
 * @param keyFn 键函数，用于复杂对象去重
 * @returns 去重后的数组
 */
export const uniqueArray = <T>(array: T[], keyFn?: (item: T) => any): T[] => {
    if (!keyFn) {
        return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

/**
 * 数组分组
 * @param array 数组
 * @param keyFn 分组键函数
 * @returns 分组后的对象
 */
export const groupBy = <T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
): Record<K, T[]> => {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {} as Record<K, T[]>);
};

// ==================== 字符串操作 ====================

/**
 * 首字母大写
 * @param str 字符串
 * @returns 首字母大写的字符串
 */
export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * 驼峰命名转换
 * @param str 字符串
 * @returns 驼峰命名的字符串
 */
export const toCamelCase = (str: string): string => {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
};

/**
 * 短横线命名转换
 * @param str 字符串
 * @returns 短横线命名的字符串
 */
export const toKebabCase = (str: string): string => {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * 下划线命名转换
 * @param str 字符串
 * @returns 下划线命名的字符串
 */
export const toSnakeCase = (str: string): string => {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};

/**
 * 截断字符串
 * @param str 字符串
 * @param length 最大长度
 * @param suffix 后缀
 * @returns 截断后的字符串
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
};

/**
 * 移除HTML标签
 * @param html HTML字符串
 * @returns 纯文本
 */
export const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

/**
 * 转义HTML字符
 * @param str 字符串
 * @returns 转义后的字符串
 */
export const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// ==================== 数值操作 ====================

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的文件大小
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * 格式化数字
 * @param num 数字
 * @param options 格式化选项
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat('zh-CN', options).format(num);
};

/**
 * 生成指定范围的随机数
 * @param min 最小值
 * @param max 最大值
 * @param integer 是否为整数
 * @returns 随机数
 */
export const randomNumber = (min: number, max: number, integer: boolean = true): number => {
    const random = Math.random() * (max - min) + min;
    return integer ? Math.floor(random) : random;
};

/**
 * 数值范围限制
 * @param value 值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

// ==================== 验证函数 ====================

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export const isValidEmail = (email: string): boolean => {
    return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * 验证URL格式
 * @param url URL地址
 * @returns 是否有效
 */
export const isValidUrl = (url: string): boolean => {
    return REGEX_PATTERNS.URL.test(url);
};

/**
 * 验证API密钥格式
 * @param apiKey API密钥
 * @returns 是否有效
 */
export const isValidApiKey = (apiKey: string): boolean => {
    return apiKey.length >= VALIDATION_RULES.API_KEY_MIN_LENGTH &&
           apiKey.length <= VALIDATION_RULES.API_KEY_MAX_LENGTH &&
           REGEX_PATTERNS.API_KEY.test(apiKey);
};

/**
 * 验证模型名称格式
 * @param modelName 模型名称
 * @returns 是否有效
 */
export const isValidModelName = (modelName: string): boolean => {
    return REGEX_PATTERNS.MODEL_NAME.test(modelName);
};

/**
 * 检查是否为空值
 * @param value 值
 * @returns 是否为空
 */
export const isEmpty = (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

// ==================== 本地存储操作 ====================

/**
 * 安全的本地存储设置
 * @param key 键名
 * @param value 值
 * @returns 是否成功
 */
export const setLocalStorage = (key: string, value: any): boolean => {
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
        return true;
    } catch (error) {
        console.error('设置本地存储失败:', error);
        return false;
    }
};

/**
 * 安全的本地存储获取
 * @param key 键名
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.error('获取本地存储失败:', error);
        return defaultValue;
    }
};

/**
 * 移除本地存储项
 * @param key 键名
 * @returns 是否成功
 */
export const removeLocalStorage = (key: string): boolean => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('移除本地存储失败:', error);
        return false;
    }
};

/**
 * 清空本地存储
 * @returns 是否成功
 */
export const clearLocalStorage = (): boolean => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('清空本地存储失败:', error);
        return false;
    }
};

// ==================== 错误处理 ====================

/**
 * 安全的JSON解析
 * @param str JSON字符串
 * @param defaultValue 默认值
 * @returns 解析结果或默认值
 */
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('JSON解析失败:', error);
        return defaultValue;
    }
};

/**
 * 安全的JSON字符串化
 * @param obj 对象
 * @param defaultValue 默认值
 * @returns JSON字符串或默认值
 */
export const safeJsonStringify = (obj: any, defaultValue: string = '{}'): string => {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('JSON字符串化失败:', error);
        return defaultValue;
    }
};

/**
 * 安全的函数执行
 * @param fn 要执行的函数
 * @param defaultValue 默认返回值
 * @param context 执行上下文
 * @returns 函数执行结果或默认值
 */
export const safeExecute = <T>(
    fn: () => T,
    defaultValue: T,
    context?: any
): T => {
    try {
        return context ? fn.call(context) : fn();
    } catch (error) {
        console.error('函数执行失败:', error);
        return defaultValue;
    }
};

/**
 * 异步函数重试
 * @param fn 异步函数
 * @param retries 重试次数
 * @param delay 重试延迟
 * @returns Promise
 */
export const retryAsync = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 1000
): Promise<T> => {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < retries) {
                await delay(delayMs * (i + 1)); // 指数退避
            }
        }
    }

    throw lastError!;
};

// ==================== 性能优化 ====================

/**
 * 创建单例
 * @param constructor 构造函数
 * @returns 单例工厂函数
 */
export const createSingleton = <T>(constructor: new (...args: any[]) => T) => {
    let instance: T;
    return (...args: any[]): T => {
        if (!instance) {
            instance = new constructor(...args);
        }
        return instance;
    };
};

/**
 * 懒加载函数
 * @param factory 工厂函数
 * @returns 懒加载包装函数
 */
export const lazy = <T>(factory: () => T): () => T => {
    let cached: T;
    let hasValue = false;

    return (): T => {
        if (!hasValue) {
            cached = factory();
            hasValue = true;
        }
        return cached;
    };
};

// ==================== 导出兼容性 ====================

// 保持向后兼容的导出
export const copyToClip = copyToClipboard;