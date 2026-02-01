/**
 * 消息缓存管理器
 * 优化消息渲染性能，减少重复计算
 */

import { createLogger } from './logger';
import type { Message } from '@/stores/types/chat';

const logger = createLogger('MessageCache');

// 缓存项接口
interface CacheItem<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

// 缓存配置
interface CacheConfig {
  maxSize: number;
  ttl: number; // 生存时间（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）
}

// 默认配置
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5分钟
  cleanupInterval: 60 * 1000, // 1分钟
};

/**
 * LRU 缓存实现
 */
export class LRUCache<K, V> {
  private cache = new Map<K, CacheItem<V>>();
  private config: CacheConfig;
  private cleanupTimer?: number;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * 获取缓存项
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccess = Date.now();

    return item.value;
  }

  /**
   * 设置缓存项
   */
  set(key: K, value: V): void {
    const now = Date.now();
    
    // 如果已存在，更新值
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      item.value = value;
      item.timestamp = now;
      item.lastAccess = now;
      item.accessCount++;
      return;
    }

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    // 添加新项
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
    });
  }

  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * 检查项是否过期
   */
  private isExpired(item: CacheItem<V>): boolean {
    return Date.now() - item.timestamp > this.config.ttl;
  }

  /**
   * 驱逐最少使用的项
   */
  private evictLeastUsed(): void {
    let leastUsedKey: K | undefined;
    let leastUsedItem: CacheItem<V> | undefined;

    for (const [key, item] of this.cache.entries()) {
      if (!leastUsedItem || 
          item.accessCount < leastUsedItem.accessCount ||
          (item.accessCount === leastUsedItem.accessCount && item.lastAccess < leastUsedItem.lastAccess)) {
        leastUsedKey = key;
        leastUsedItem = item;
      }
    }

    if (leastUsedKey !== undefined) {
      this.cache.delete(leastUsedKey);
      logger.debug('Evicted least used cache item', { key: leastUsedKey });
    }
  }

  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired cache items', { count: cleanedCount });
    }
  }

  /**
   * 开始定期清理
   */
  private startCleanup(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const items = Array.from(this.cache.values());
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const avgAccess = items.length > 0 ? totalAccess / items.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalAccess,
      avgAccess,
      hitRate: 0, // 需要外部统计
    };
  }
}

/**
 * 消息缓存管理器
 */
export class MessageCacheManager {
  private heightCache = new LRUCache<string, number>();
  private contentCache = new LRUCache<string, string>();
  private modelCache = new LRUCache<string, any>();
  private hitCounts = { height: 0, content: 0, model: 0 };
  private missCounts = { height: 0, content: 0, model: 0 };

  /**
   * 缓存消息高度
   */
  cacheMessageHeight(messageId: string, height: number): void {
    this.heightCache.set(messageId, height);
  }

  /**
   * 获取缓存的消息高度
   */
  getMessageHeight(messageId: string): number | undefined {
    const height = this.heightCache.get(messageId);
    if (height !== undefined) {
      this.hitCounts.height++;
    } else {
      this.missCounts.height++;
    }
    return height;
  }

  /**
   * 缓存渲染后的内容
   */
  cacheRenderedContent(contentHash: string, renderedContent: string): void {
    this.contentCache.set(contentHash, renderedContent);
  }

  /**
   * 获取缓存的渲染内容
   */
  getRenderedContent(contentHash: string): string | undefined {
    const content = this.contentCache.get(contentHash);
    if (content !== undefined) {
      this.hitCounts.content++;
    } else {
      this.missCounts.content++;
    }
    return content;
  }

  /**
   * 缓存模型信息
   */
  cacheModelInfo(modelId: string, modelInfo: any): void {
    this.modelCache.set(modelId, modelInfo);
  }

  /**
   * 获取缓存的模型信息
   */
  getModelInfo(modelId: string): any {
    const info = this.modelCache.get(modelId);
    if (info !== undefined) {
      this.hitCounts.model++;
    } else {
      this.missCounts.model++;
    }
    return info;
  }

  /**
   * 清理消息相关缓存
   */
  clearMessageCache(messageId: string): void {
    this.heightCache.delete(messageId);
    // 内容缓存使用hash，不直接关联messageId
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const calculateHitRate = (hits: number, misses: number) => {
      const total = hits + misses;
      return total > 0 ? (hits / total) * 100 : 0;
    };

    return {
      height: {
        ...this.heightCache.getStats(),
        hitRate: calculateHitRate(this.hitCounts.height, this.missCounts.height),
        hits: this.hitCounts.height,
        misses: this.missCounts.height,
      },
      content: {
        ...this.contentCache.getStats(),
        hitRate: calculateHitRate(this.hitCounts.content, this.missCounts.content),
        hits: this.hitCounts.content,
        misses: this.missCounts.content,
      },
      model: {
        ...this.modelCache.getStats(),
        hitRate: calculateHitRate(this.hitCounts.model, this.missCounts.model),
        hits: this.hitCounts.model,
        misses: this.missCounts.model,
      },
    };
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.heightCache.clear();
    this.contentCache.clear();
    this.modelCache.clear();
    
    // 重置统计
    this.hitCounts = { height: 0, content: 0, model: 0 };
    this.missCounts = { height: 0, content: 0, model: 0 };
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.heightCache.destroy();
    this.contentCache.destroy();
    this.modelCache.destroy();
  }
}

// 创建全局消息缓存管理器实例
export const messageCacheManager = new MessageCacheManager();

// 在开发环境下定期输出缓存统计
if (import.meta.env.DEV) {
  setInterval(() => {
    const stats = messageCacheManager.getStats();
    logger.debug('Message cache stats', stats);
  }, 30000); // 每30秒输出一次
}

// 页面卸载时清理缓存
window.addEventListener('beforeunload', () => {
  messageCacheManager.destroy();
});
