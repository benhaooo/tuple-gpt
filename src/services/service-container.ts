/**
 * 服务容器 - 依赖注入容器
 * 管理所有服务的生命周期和依赖关系
 */

import { createLogger } from '@/utils/logger';
import type { 
  IServiceContainer, 
  BaseService, 
  ServiceEvent, 
  ServiceEventType,
  ServiceMetrics,
  ServiceConfig 
} from './types';

const logger = createLogger('ServiceContainer');

/**
 * 服务容器实现
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, BaseService>();
  private metrics = new Map<string, ServiceMetrics>();
  private eventListeners = new Map<string, ((event: ServiceEvent) => void)[]>();
  private config: ServiceConfig;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      enableEvents: true,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    logger.info('Service container initialized', { config: this.config });
  }

  /**
   * 注册服务
   */
  register<T extends BaseService>(name: string, service: T): void {
    if (this.services.has(name)) {
      logger.warn('Service already registered, replacing', { serviceName: name });
    }

    this.services.set(name, service);
    this.initializeMetrics(name);

    if (this.config.enableLogging) {
      logger.info('Service registered', { serviceName: name, serviceType: service.constructor.name });
    }

    this.emitEvent({
      type: ServiceEventType.SERVICE_REGISTERED,
      serviceName: name,
      timestamp: Date.now(),
      data: { serviceType: service.constructor.name },
    });

    // 初始化服务
    if (service.initialize) {
      service.initialize().catch(error => {
        logger.error('Service initialization failed', error, { serviceName: name });
        this.emitEvent({
          type: ServiceEventType.SERVICE_ERROR,
          serviceName: name,
          timestamp: Date.now(),
          error: {
            code: 'INITIALIZATION_FAILED',
            message: error.message,
            details: error,
          },
        });
      });
    }
  }

  /**
   * 获取服务
   */
  get<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    
    if (!service) {
      const error = new Error(`Service '${name}' not found`);
      logger.error('Service not found', error, { serviceName: name });
      throw error;
    }

    return service as T;
  }

  /**
   * 检查服务是否存在
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 移除服务
   */
  remove(name: string): boolean {
    const service = this.services.get(name);
    
    if (!service) {
      return false;
    }

    // 销毁服务
    if (service.destroy) {
      service.destroy().catch(error => {
        logger.error('Service destruction failed', error, { serviceName: name });
      });
    }

    this.services.delete(name);
    this.metrics.delete(name);

    if (this.config.enableLogging) {
      logger.info('Service removed', { serviceName: name });
    }

    this.emitEvent({
      type: ServiceEventType.SERVICE_REMOVED,
      serviceName: name,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * 清空所有服务
   */
  clear(): void {
    const serviceNames = Array.from(this.services.keys());
    
    for (const name of serviceNames) {
      this.remove(name);
    }

    logger.info('All services cleared');
  }

  /**
   * 获取所有服务
   */
  getAll(): Map<string, BaseService> {
    return new Map(this.services);
  }

  /**
   * 获取服务列表
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 获取服务指标
   */
  getMetrics(serviceName: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceName);
  }

  /**
   * 获取所有服务指标
   */
  getAllMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: (event: ServiceEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: (event: ServiceEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 发出事件
   */
  private emitEvent(event: ServiceEvent): void {
    if (!this.config.enableEvents) return;

    const listeners = this.eventListeners.get(event.type);
    
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error('Event listener error', error, { eventType: event.type });
        }
      });
    }

    // 发出通用事件
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error('Universal event listener error', error, { eventType: event.type });
        }
      });
    }
  }

  /**
   * 初始化服务指标
   */
  private initializeMetrics(serviceName: string): void {
    if (!this.config.enableMetrics) return;

    this.metrics.set(serviceName, {
      operationCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastOperationTime: new Date(),
      uptime: Date.now(),
    });
  }

  /**
   * 更新服务指标
   */
  updateMetrics(serviceName: string, success: boolean, responseTime: number): void {
    if (!this.config.enableMetrics) return;

    const metrics = this.metrics.get(serviceName);
    if (!metrics) return;

    metrics.operationCount++;
    metrics.lastOperationTime = new Date();
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // 计算平均响应时间
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.operationCount - 1) + responseTime) / metrics.operationCount;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; services: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, service] of this.services) {
      try {
        // 如果服务有健康检查方法，调用它
        if ('healthCheck' in service && typeof service.healthCheck === 'function') {
          const healthy = await (service as any).healthCheck();
          results[name] = healthy;
          if (!healthy) allHealthy = false;
        } else {
          // 默认认为服务是健康的
          results[name] = true;
        }
      } catch (error) {
        logger.error('Health check failed', error, { serviceName: name });
        results[name] = false;
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      services: results,
    };
  }

  /**
   * 获取容器统计信息
   */
  getStats() {
    const totalServices = this.services.size;
    const totalOperations = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.operationCount, 0);
    const totalSuccesses = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.successCount, 0);
    const totalErrors = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.errorCount, 0);

    return {
      totalServices,
      totalOperations,
      totalSuccesses,
      totalErrors,
      successRate: totalOperations > 0 ? totalSuccesses / totalOperations : 0,
      uptime: Date.now() - Math.min(...Array.from(this.metrics.values()).map(m => m.uptime)),
    };
  }
}

// 创建默认服务容器实例
export const serviceContainer = new ServiceContainer();

// 便捷的服务访问函数
export const getService = <T extends BaseService>(name: string): T => {
  return serviceContainer.get<T>(name);
};

export const registerService = <T extends BaseService>(name: string, service: T): void => {
  serviceContainer.register(name, service);
};

export const hasService = (name: string): boolean => {
  return serviceContainer.has(name);
};
