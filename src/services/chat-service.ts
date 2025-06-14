/**
 * 聊天服务
 * 提供高级的聊天功能，封装复杂的业务逻辑
 */

import { createLogger } from '@/utils/logger';
import { useChatService as useChatServiceStore } from '@/stores/modules/chat-service';
import { useSessionStore } from '@/stores/modules/session';
import { useMessageStore } from '@/stores/modules/message';
import type { 
  IChatService, 
  ServiceResult, 
  ServiceError,
  ServiceConfig 
} from './types';
import type { 
  Message, 
  SendMessageOptions 
} from '@/stores/types/chat';

const logger = createLogger('ChatService');

/**
 * 聊天服务实现
 */
export class ChatService implements IChatService {
  readonly name = 'ChatService';
  private config: ServiceConfig;
  private chatServiceStore = useChatServiceStore();
  private sessionStore = useSessionStore();
  private messageStore = useMessageStore();

  constructor(config: ServiceConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    logger.info('Chat service initializing');
    // 这里可以添加初始化逻辑，比如加载配置、连接外部服务等
    logger.info('Chat service initialized');
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    logger.info('Chat service destroying');
    // 清理资源
    this.chatServiceStore.stopAllProcessing();
    logger.info('Chat service destroyed');
  }

  /**
   * 发送消息
   */
  async sendMessage(
    text: string, 
    options: Partial<SendMessageOptions> = {}
  ): Promise<ServiceResult<string>> {
    const startTime = Date.now();
    
    try {
      logger.debug('Sending message', { textLength: text.length, options });

      if (!text.trim()) {
        return this.createErrorResult('INVALID_INPUT', 'Message text cannot be empty');
      }

      const result = await this.chatServiceStore.sendMessage(
        text,
        options.num,
        options.formatter,
        options.empowerThink,
        options.selectedModels
      );

      const responseTime = Date.now() - startTime;
      
      if (result.success) {
        logger.info('Message sent successfully', { 
          messageId: result.messageId,
          responseTime 
        });
        
        return this.createSuccessResult(result.messageId!, {
          responseTime,
          textLength: text.length,
        });
      } else {
        logger.error('Failed to send message', { error: result.error });
        return this.createErrorResult('SEND_FAILED', result.error || 'Unknown error');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Send message error', error, { responseTime });
      
      return this.createErrorResult(
        'SEND_ERROR', 
        error.message || 'Failed to send message',
        error
      );
    }
  }

  /**
   * 发送图片消息
   */
  async sendImageMessage(
    text: string, 
    imageUrl: string, 
    options: Partial<SendMessageOptions> = {}
  ): Promise<ServiceResult<string>> {
    const startTime = Date.now();
    
    try {
      logger.debug('Sending image message', { 
        textLength: text.length, 
        imageUrl: imageUrl.substring(0, 50) + '...',
        options 
      });

      if (!text.trim() && !imageUrl) {
        return this.createErrorResult('INVALID_INPUT', 'Message text or image URL is required');
      }

      if (imageUrl && !this.isValidImageUrl(imageUrl)) {
        return this.createErrorResult('INVALID_IMAGE_URL', 'Invalid image URL format');
      }

      const result = await this.chatServiceStore.sendImageMessage(
        text,
        imageUrl,
        options.num
      );

      const responseTime = Date.now() - startTime;
      
      if (result.success) {
        logger.info('Image message sent successfully', { 
          messageId: result.messageId,
          responseTime 
        });
        
        return this.createSuccessResult(result.messageId!, {
          responseTime,
          textLength: text.length,
          hasImage: !!imageUrl,
        });
      } else {
        logger.error('Failed to send image message', { error: result.error });
        return this.createErrorResult('SEND_FAILED', result.error || 'Unknown error');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Send image message error', error, { responseTime });
      
      return this.createErrorResult(
        'SEND_ERROR', 
        error.message || 'Failed to send image message',
        error
      );
    }
  }

  /**
   * 重新生成回复
   */
  async regenerateResponse(messageId: string): Promise<ServiceResult<string>> {
    const startTime = Date.now();
    
    try {
      logger.debug('Regenerating response', { messageId });

      if (!messageId) {
        return this.createErrorResult('INVALID_INPUT', 'Message ID is required');
      }

      const result = await this.chatServiceStore.regenerateResponse(messageId);
      const responseTime = Date.now() - startTime;
      
      if (result.success) {
        logger.info('Response regenerated successfully', { 
          originalMessageId: messageId,
          newMessageId: result.messageId,
          responseTime 
        });
        
        return this.createSuccessResult(result.messageId!, {
          responseTime,
          originalMessageId: messageId,
        });
      } else {
        logger.error('Failed to regenerate response', { error: result.error });
        return this.createErrorResult('REGENERATE_FAILED', result.error || 'Unknown error');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Regenerate response error', error, { responseTime });
      
      return this.createErrorResult(
        'REGENERATE_ERROR', 
        error.message || 'Failed to regenerate response',
        error
      );
    }
  }

  /**
   * 停止消息处理
   */
  async stopMessage(messageId: string): Promise<ServiceResult<boolean>> {
    try {
      logger.debug('Stopping message', { messageId });

      if (!messageId) {
        return this.createErrorResult('INVALID_INPUT', 'Message ID is required');
      }

      const stopped = this.messageStore.stopMessageStream(messageId);
      
      if (stopped) {
        logger.info('Message stopped successfully', { messageId });
        return this.createSuccessResult(true);
      } else {
        logger.warn('Message not found or already stopped', { messageId });
        return this.createErrorResult('NOT_FOUND', 'Message not found or already stopped');
      }

    } catch (error) {
      logger.error('Stop message error', error, { messageId });
      
      return this.createErrorResult(
        'STOP_ERROR', 
        error.message || 'Failed to stop message',
        error
      );
    }
  }

  /**
   * 获取消息历史
   */
  async getMessageHistory(
    sessionId: string, 
    limit: number = 50
  ): Promise<ServiceResult<Message[]>> {
    try {
      logger.debug('Getting message history', { sessionId, limit });

      if (!sessionId) {
        return this.createErrorResult('INVALID_INPUT', 'Session ID is required');
      }

      const session = this.sessionStore.getSession(sessionId);
      if (!session) {
        return this.createErrorResult('NOT_FOUND', 'Session not found');
      }

      const messages = session.messages.slice(-limit);
      
      logger.debug('Message history retrieved', { 
        sessionId, 
        messageCount: messages.length 
      });
      
      return this.createSuccessResult(messages, {
        sessionId,
        totalMessages: session.messages.length,
        returnedMessages: messages.length,
      });

    } catch (error) {
      logger.error('Get message history error', error, { sessionId });
      
      return this.createErrorResult(
        'HISTORY_ERROR', 
        error.message || 'Failed to get message history',
        error
      );
    }
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats() {
    return this.chatServiceStore.getProcessingStats();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 检查各个 store 是否正常
      const sessionStore = this.sessionStore;
      const messageStore = this.messageStore;
      const chatServiceStore = this.chatServiceStore;

      // 简单的健康检查
      return !!(sessionStore && messageStore && chatServiceStore);
    } catch (error) {
      logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * 验证图片 URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 创建成功结果
   */
  private createSuccessResult<T>(data: T, metadata?: Record<string, any>): ServiceResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(code: string, message: string, details?: any): ServiceResult<never> {
    const error: ServiceError = {
      code,
      message,
      details,
    };

    return {
      success: false,
      error,
    };
  }
}
