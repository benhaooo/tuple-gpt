/**
 * 消息管理 Store
 * 负责消息的创建、删除、格式化等操作
 */

import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { generateUniqueId } from '@/utils/commonUtils';
import { createLogger } from '@/utils/logger';
import { useSessionStore } from './session';
import type { 
  Message, 
  MultiContent, 
  MessageStore, 
  SystemMessage,
  HistoryMessage,
  MessageContent,
  MessageStats,
  ChatEventType 
} from '../types/chat';

const logger = createLogger('MessageStore');

export const useMessageStore = defineStore('message', {
  state: (): MessageStore => ({
    processingMessages: new Set<string>(),
    streamControllers: new Map<string, any>(),
  }),

  getters: {
    /**
     * 检查消息是否正在处理
     */
    isMessageProcessing: (state) => (messageId: string): boolean => {
      return state.processingMessages.has(messageId);
    },

    /**
     * 获取正在处理的消息数量
     */
    processingCount: (state): number => {
      return state.processingMessages.size;
    },

    /**
     * 检查是否有流控制器
     */
    hasStreamController: (state) => (messageId: string): boolean => {
      return state.streamControllers.has(messageId);
    },
  },

  actions: {
    /**
     * 创建消息
     */
    createMessage(
      sessionId: string, 
      index: number, 
      role: string
    ): boolean {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        logger.warn('Session not found for message creation', { sessionId });
        return false;
      }

      const message: Message = {
        id: generateUniqueId(),
        role,
        multiContent: [{
          content: '',
          id: generateUniqueId(),
        }],
        selectedContent: 0,
      };

      session.messages.splice(index, 0, message);
      
      logger.debug('Message created', { 
        sessionId, 
        messageId: message.id, 
        role, 
        index 
      });

      sessionStore.emitEvent({
        type: ChatEventType.MESSAGE_SENT,
        timestamp: Date.now(),
        data: message,
        sessionId,
        messageId: message.id,
      });

      return true;
    },

    /**
     * 删除消息
     */
    deleteMessage(sessionId: string, messageId: string): boolean {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);

      if (!session) {
        logger.warn('Session not found for message deletion', { sessionId });
        return false;
      }

      // 在删除消息前，先清理相关的流控制器和处理状态
      this.completeMessage(messageId);

      const initialLength = session.messages.length;
      session.messages = session.messages.filter(msg => msg.id !== messageId);

      const deleted = session.messages.length < initialLength;
      if (deleted) {
        logger.info('Message deleted', { sessionId, messageId });

        sessionStore.emitEvent({
          type: ChatEventType.MESSAGE_DELETED,
          timestamp: Date.now(),
          data: { messageId },
          sessionId,
          messageId,
        });
      } else {
        logger.warn('Message not found for deletion', { sessionId, messageId });
      }

      return deleted;
    },

    /**
     * 格式化消息文本
     */
    formatMessage(sessionId: string, text: string): string {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        logger.warn('Session not found for message formatting', { sessionId });
        return text;
      }

      const template = session.format || '';
      const placeholderRegEx = /\${(.*?)}/g;
      
      if (!template || !placeholderRegEx.test(template)) {
        return `${template}${text}`;
      }
      
      return template.replace(placeholderRegEx, text);
    },

    /**
     * 获取系统消息
     */
    getSystemMessage(sessionId: string): SystemMessage | null {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session?.system) {
        return null;
      }

      return {
        role: 'system',
        content: session.system
      };
    },

    /**
     * 获取历史消息
     */
    getHistoryMessages(
      sessionId: string, 
      index: number, 
      targetSessionId?: string
    ): HistoryMessage[] {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      const targetSession = targetSessionId ? sessionStore.getSession(targetSessionId) : session;
      
      if (!session) {
        logger.warn('Session not found for history messages', { sessionId });
        return [];
      }

      const reversed = targetSession?.role === 'user';
      const historyMessages = session.messages.slice(
        Math.max(0, index - session.ctxLimit), 
        index
      );

      return historyMessages.map(msg => ({
        role: reversed 
          ? (msg.role === 'assistant' ? 'user' : 'assistant') 
          : msg.role,
        content: msg.multiContent && typeof msg.selectedContent === 'number'
          ? msg.multiContent[msg.selectedContent].content 
          : (msg.content || ''),
      }));
    },

    /**
     * 创建响应消息
     */
    createResponseMessage(
      sessionId: string, 
      index: number, 
      models: string[], 
      formatter: string = ''
    ): Message | null {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        logger.warn('Session not found for response message creation', { sessionId });
        return null;
      }

      const responseMessage: Message = reactive({
        id: generateUniqueId(),
        role: 'assistant',
        selectedContent: 0,
        multiContent: models.map(model => ({ 
          content: formatter, 
          reasoning_content: '', 
          chatting: true, 
          id: generateUniqueId(), 
          model 
        })),
        chatting: true
      });
      
      session.messages.splice(index + 1, 0, responseMessage);
      
      logger.debug('Response message created', { 
        sessionId, 
        messageId: responseMessage.id, 
        models: models.length 
      });

      return responseMessage;
    },

    /**
     * 完成消息处理
     */
    completeMessage(messageId: string): void {
      // 先停止并清理流控制器
      const controller = this.streamControllers.get(messageId);
      if (controller) {
        try {
          if (typeof controller.abort === 'function') {
            controller.abort();
          }
          // 如果是 ReadableStream，也要取消
          if (typeof controller.cancel === 'function') {
            controller.cancel();
          }
        } catch (error) {
          logger.warn('Error aborting stream controller', error, { messageId });
        }
      }

      this.processingMessages.delete(messageId);
      this.streamControllers.delete(messageId);

      logger.debug('Message processing completed', { messageId });
    },

    /**
     * 开始消息处理
     */
    startMessageProcessing(messageId: string): void {
      this.processingMessages.add(messageId);
      logger.debug('Message processing started', { messageId });
    },

    /**
     * 设置流控制器
     */
    setStreamController(messageId: string, controller: any): void {
      this.streamControllers.set(messageId, controller);
      logger.debug('Stream controller set', { messageId });
    },

    /**
     * 获取流控制器
     */
    getStreamController(messageId: string): any {
      return this.streamControllers.get(messageId);
    },

    /**
     * 停止消息流
     */
    stopMessageStream(messageId: string): boolean {
      const controller = this.streamControllers.get(messageId);
      if (controller && typeof controller.abort === 'function') {
        controller.abort();
        this.streamControllers.delete(messageId);
        this.processingMessages.delete(messageId);
        
        logger.info('Message stream stopped', { messageId });
        return true;
      }
      
      return false;
    },

    /**
     * 更新消息内容
     */
    updateMessageContent(
      sessionId: string, 
      messageId: string, 
      contentIndex: number, 
      content: string,
      reasoning?: string
    ): boolean {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        logger.warn('Session not found for message update', { sessionId });
        return false;
      }

      const message = session.messages.find(msg => msg.id === messageId);
      if (!message?.multiContent?.[contentIndex]) {
        logger.warn('Message or content not found for update', { 
          sessionId, 
          messageId, 
          contentIndex 
        });
        return false;
      }

      const multiContent = message.multiContent[contentIndex];
      multiContent.content = content;
      
      if (reasoning !== undefined) {
        multiContent.reasoning_content = reasoning;
      }

      return true;
    },

    /**
     * 获取消息统计信息
     */
    getMessageStats(sessionId: string): MessageStats {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        return {
          totalMessages: 0,
          userMessages: 0,
          assistantMessages: 0,
          systemMessages: 0,
          averageLength: 0,
        };
      }

      const messages = session.messages;
      const totalMessages = messages.length;
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;
      const systemMessages = messages.filter(m => m.role === 'system').length;
      
      const totalLength = messages.reduce((sum, msg) => {
        const content = msg.content || 
          (msg.multiContent?.[msg.selectedContent || 0]?.content) || '';
        return sum + content.length;
      }, 0);

      return {
        totalMessages,
        userMessages,
        assistantMessages,
        systemMessages,
        averageLength: totalMessages > 0 ? totalLength / totalMessages : 0,
      };
    },

    /**
     * 清理消息处理状态
     */
    cleanupProcessingState(): void {
      // 先停止所有活跃的流控制器
      for (const [messageId, controller] of this.streamControllers.entries()) {
        try {
          if (typeof controller.abort === 'function') {
            controller.abort();
          }
          if (typeof controller.cancel === 'function') {
            controller.cancel();
          }
        } catch (error) {
          logger.warn('Error cleaning up stream controller', error, { messageId });
        }
      }

      this.processingMessages.clear();
      this.streamControllers.clear();
      logger.info('Message processing state cleaned up');
    },

    /**
     * 清理所有流控制器和处理状态
     * 用于组件卸载或应用关闭时的资源清理
     */
    cleanupAllResources(): void {
      this.cleanupProcessingState();
      logger.info('All message resources cleaned up');
    },

    /**
     * 清理会话相关的资源
     */
    cleanupSessionResources(sessionId: string): void {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);

      if (!session) {
        return;
      }

      // 清理该会话下所有消息的流控制器
      const messageIds = session.messages.map(msg => msg.id);
      messageIds.forEach(messageId => {
        this.completeMessage(messageId);
      });

      logger.info('Session resources cleaned up', { sessionId });
    },

    /**
     * 获取消息
     */
    getMessage(sessionId: string, messageId: string): Message | undefined {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      return session?.messages.find(msg => msg.id === messageId);
    },

    /**
     * 获取消息索引
     */
    getMessageIndex(sessionId: string, messageId: string): number {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) return -1;
      return session.messages.findIndex(msg => msg.id === messageId);
    },
  },
});

export default useMessageStore;
