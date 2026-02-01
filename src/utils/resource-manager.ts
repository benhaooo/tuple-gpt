/**
 * 全局资源管理器
 * 负责管理应用中的所有资源，防止内存泄漏
 */

import { createLogger } from './logger';
import { onUnmounted, onBeforeUnmount } from 'vue';

const logger = createLogger('ResourceManager');

// 资源类型枚举
export enum ResourceType {
  TIMER = 'timer',
  INTERVAL = 'interval',
  EVENT_LISTENER = 'event_listener',
  ABORT_CONTROLLER = 'abort_controller',
  STREAM = 'stream',
  OBSERVER = 'observer',
  SUBSCRIPTION = 'subscription',
}

// 资源接口
export interface Resource {
  id: string;
  type: ResourceType;
  cleanup: () => void;
  metadata?: any;
}

/**
 * 资源管理器类
 */
export class ResourceManager {
  private resources = new Map<string, Resource>();
  private componentResources = new Map<string, Set<string>>();

  /**
   * 注册资源
   */
  register(resource: Resource, componentId?: string): string {
    this.resources.set(resource.id, resource);
    
    if (componentId) {
      if (!this.componentResources.has(componentId)) {
        this.componentResources.set(componentId, new Set());
      }
      this.componentResources.get(componentId)!.add(resource.id);
    }

    logger.debug('Resource registered', { 
      resourceId: resource.id, 
      type: resource.type,
      componentId 
    });

    return resource.id;
  }

  /**
   * 清理单个资源
   */
  cleanup(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    try {
      resource.cleanup();
      this.resources.delete(resourceId);
      
      // 从组件资源中移除
      for (const [componentId, resourceIds] of this.componentResources.entries()) {
        if (resourceIds.has(resourceId)) {
          resourceIds.delete(resourceId);
          if (resourceIds.size === 0) {
            this.componentResources.delete(componentId);
          }
          break;
        }
      }

      logger.debug('Resource cleaned up', { resourceId, type: resource.type });
      return true;
    } catch (error) {
      logger.error('Failed to cleanup resource', error, { resourceId, type: resource.type });
      return false;
    }
  }

  /**
   * 清理组件的所有资源
   */
  cleanupComponent(componentId: string): number {
    const resourceIds = this.componentResources.get(componentId);
    if (!resourceIds) {
      return 0;
    }

    let cleanedCount = 0;
    for (const resourceId of resourceIds) {
      if (this.cleanup(resourceId)) {
        cleanedCount++;
      }
    }

    this.componentResources.delete(componentId);
    logger.info('Component resources cleaned up', { componentId, cleanedCount });
    return cleanedCount;
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): number {
    let cleanedCount = 0;
    
    for (const [resourceId, resource] of this.resources.entries()) {
      try {
        resource.cleanup();
        cleanedCount++;
      } catch (error) {
        logger.error('Failed to cleanup resource during global cleanup', error, { 
          resourceId, 
          type: resource.type 
        });
      }
    }

    this.resources.clear();
    this.componentResources.clear();
    
    logger.info('All resources cleaned up', { cleanedCount });
    return cleanedCount;
  }

  /**
   * 获取资源统计信息
   */
  getStats() {
    const stats = new Map<ResourceType, number>();
    
    for (const resource of this.resources.values()) {
      const count = stats.get(resource.type) || 0;
      stats.set(resource.type, count + 1);
    }

    return {
      totalResources: this.resources.size,
      totalComponents: this.componentResources.size,
      byType: Object.fromEntries(stats),
    };
  }

  /**
   * 检查是否有泄漏的资源
   */
  checkForLeaks(): { hasLeaks: boolean; details: any } {
    const stats = this.getStats();
    const hasLeaks = stats.totalResources > 0;
    
    if (hasLeaks) {
      logger.warn('Potential memory leaks detected', stats);
    }

    return {
      hasLeaks,
      details: stats,
    };
  }
}

// 创建全局资源管理器实例
export const resourceManager = new ResourceManager();

/**
 * 便捷的资源注册函数
 */
export const registerResource = (
  type: ResourceType,
  cleanup: () => void,
  metadata?: any,
  componentId?: string
): string => {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return resourceManager.register({ id, type, cleanup, metadata }, componentId);
};

/**
 * 定时器资源管理
 */
export const createManagedTimer = (
  callback: () => void,
  delay: number,
  componentId?: string
): string => {
  const timerId = setTimeout(callback, delay);
  return registerResource(
    ResourceType.TIMER,
    () => clearTimeout(timerId),
    { delay },
    componentId
  );
};

/**
 * 间隔器资源管理
 */
export const createManagedInterval = (
  callback: () => void,
  interval: number,
  componentId?: string
): string => {
  const intervalId = setInterval(callback, interval);
  return registerResource(
    ResourceType.INTERVAL,
    () => clearInterval(intervalId),
    { interval },
    componentId
  );
};

/**
 * 事件监听器资源管理
 */
export const createManagedEventListener = (
  target: EventTarget,
  event: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
  componentId?: string
): string => {
  target.addEventListener(event, listener, options);
  return registerResource(
    ResourceType.EVENT_LISTENER,
    () => target.removeEventListener(event, listener, options),
    { event, target: target.constructor.name },
    componentId
  );
};

/**
 * AbortController 资源管理
 */
export const createManagedAbortController = (componentId?: string): [AbortController, string] => {
  const controller = new AbortController();
  const resourceId = registerResource(
    ResourceType.ABORT_CONTROLLER,
    () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    },
    { aborted: false },
    componentId
  );
  
  return [controller, resourceId];
};

/**
 * Vue 组合式函数：自动清理组件资源
 */
export const useResourceCleanup = (componentId?: string) => {
  const id = componentId || `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 组件卸载时自动清理
  onBeforeUnmount(() => {
    resourceManager.cleanupComponent(id);
  });

  return {
    componentId: id,
    registerTimer: (callback: () => void, delay: number) => 
      createManagedTimer(callback, delay, id),
    registerInterval: (callback: () => void, interval: number) => 
      createManagedInterval(callback, interval, id),
    registerEventListener: (target: EventTarget, event: string, listener: EventListener, options?: boolean | AddEventListenerOptions) => 
      createManagedEventListener(target, event, listener, options, id),
    registerAbortController: () => createManagedAbortController(id),
    cleanup: () => resourceManager.cleanupComponent(id),
  };
};

// 在开发环境下，定期检查内存泄漏
if (import.meta.env.DEV) {
  setInterval(() => {
    const { hasLeaks, details } = resourceManager.checkForLeaks();
    if (hasLeaks) {
      console.warn('🚨 Memory leak detection:', details);
    }
  }, 30000); // 每30秒检查一次
}

// 页面卸载时清理所有资源
window.addEventListener('beforeunload', () => {
  resourceManager.cleanupAll();
});
