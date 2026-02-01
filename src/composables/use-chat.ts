/**
 * 聊天相关的 Composable
 * 提供聊天功能的响应式接口
 */

import { ref, computed } from 'vue';
import { createLogger } from '@/utils/logger';
import { getService } from '@/services/service-container';
import type { ChatService } from '@/services/chat-service';
import type { UseChatReturn, ToastOptions } from './types';
import type { SendMessageOptions } from '@/stores/types/chat';

const logger = createLogger('UseChat');

/**
 * 聊天功能 Composable
 */
export function useChat(): UseChatReturn {
  // 状态
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 获取聊天服务
  const getChatService = (): ChatService => {
    try {
      return getService<ChatService>('ChatService');
    } catch (err) {
      // 如果服务未注册，创建一个新实例
      const { ChatService } = require('@/services/chat-service');
      const chatService = new ChatService();
      const { registerService } = require('@/services/service-container');
      registerService('ChatService', chatService);
      return chatService;
    }
  };

  /**
   * 清除错误
   */
  const clearError = (): void => {
    error.value = null;
  };

  /**
   * 处理服务结果
   */
  const handleServiceResult = <T>(result: any): T | null => {
    if (result.success) {
      clearError();
      return result.data;
    } else {
      error.value = result.error?.message || 'Unknown error';
      logger.error('Service operation failed', result.error);
      return null;
    }
  };

  /**
   * 发送消息
   */
  const sendMessage = async (
    text: string, 
    options: Partial<SendMessageOptions> = {}
  ): Promise<void> => {
    if (isLoading.value) {
      logger.warn('Already sending a message, ignoring new request');
      return;
    }

    isLoading.value = true;
    clearError();

    try {
      logger.debug('Sending message', { textLength: text.length, options });

      const chatService = getChatService();
      const result = await chatService.sendMessage(text, options);
      
      const messageId = handleServiceResult<string>(result);
      if (messageId) {
        logger.info('Message sent successfully', { messageId });
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to send message';
      error.value = errorMessage;
      logger.error('Send message error', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 发送图片消息
   */
  const sendImageMessage = async (
    text: string, 
    imageUrl: string, 
    options: Partial<SendMessageOptions> = {}
  ): Promise<void> => {
    if (isLoading.value) {
      logger.warn('Already sending a message, ignoring new request');
      return;
    }

    isLoading.value = true;
    clearError();

    try {
      logger.debug('Sending image message', { 
        textLength: text.length, 
        hasImage: !!imageUrl,
        options 
      });

      const chatService = getChatService();
      const result = await chatService.sendImageMessage(text, imageUrl, options);
      
      const messageId = handleServiceResult<string>(result);
      if (messageId) {
        logger.info('Image message sent successfully', { messageId });
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to send image message';
      error.value = errorMessage;
      logger.error('Send image message error', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 重新生成回复
   */
  const regenerateResponse = async (messageId: string): Promise<void> => {
    if (isLoading.value) {
      logger.warn('Already processing, ignoring regenerate request');
      return;
    }

    isLoading.value = true;
    clearError();

    try {
      logger.debug('Regenerating response', { messageId });

      const chatService = getChatService();
      const result = await chatService.regenerateResponse(messageId);
      
      const newMessageId = handleServiceResult<string>(result);
      if (newMessageId) {
        logger.info('Response regenerated successfully', { 
          originalMessageId: messageId,
          newMessageId 
        });
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to regenerate response';
      error.value = errorMessage;
      logger.error('Regenerate response error', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 停止消息处理
   */
  const stopMessage = async (messageId: string): Promise<void> => {
    try {
      logger.debug('Stopping message', { messageId });

      const chatService = getChatService();
      const result = await chatService.stopMessage(messageId);
      
      const stopped = handleServiceResult<boolean>(result);
      if (stopped) {
        logger.info('Message stopped successfully', { messageId });
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to stop message';
      error.value = errorMessage;
      logger.error('Stop message error', err);
    }
  };

  return {
    // 状态
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // 方法
    sendMessage,
    sendImageMessage,
    regenerateResponse,
    stopMessage,
    clearError,
  };
}

/**
 * 聊天快捷操作 Composable
 */
export function useChatActions() {
  const chat = useChat();

  /**
   * 快速发送文本消息
   */
  const quickSend = async (text: string): Promise<void> => {
    await chat.sendMessage(text);
  };

  /**
   * 发送多模型消息
   */
  const sendToMultipleModels = async (
    text: string, 
    models: string[]
  ): Promise<void> => {
    await chat.sendMessage(text, { selectedModels: models });
  };

  /**
   * 发送带格式的消息
   */
  const sendFormattedMessage = async (
    text: string, 
    formatter: string
  ): Promise<void> => {
    await chat.sendMessage(text, { formatter });
  };

  /**
   * 发送思考增强消息
   */
  const sendWithThinking = async (text: string): Promise<void> => {
    await chat.sendMessage(text, { empowerThink: true });
  };

  return {
    ...chat,
    quickSend,
    sendToMultipleModels,
    sendFormattedMessage,
    sendWithThinking,
  };
}

/**
 * 聊天状态监控 Composable
 */
export function useChatStatus() {
  const isProcessing = ref(false);
  const processingCount = ref(0);
  const lastActivity = ref<Date | null>(null);

  /**
   * 更新处理状态
   */
  const updateProcessingStatus = (processing: boolean): void => {
    if (processing) {
      processingCount.value++;
      isProcessing.value = true;
    } else {
      processingCount.value = Math.max(0, processingCount.value - 1);
      isProcessing.value = processingCount.value > 0;
    }
    
    lastActivity.value = new Date();
  };

  /**
   * 重置状态
   */
  const resetStatus = (): void => {
    isProcessing.value = false;
    processingCount.value = 0;
    lastActivity.value = null;
  };

  return {
    isProcessing: computed(() => isProcessing.value),
    processingCount: computed(() => processingCount.value),
    lastActivity: computed(() => lastActivity.value),
    updateProcessingStatus,
    resetStatus,
  };
}
