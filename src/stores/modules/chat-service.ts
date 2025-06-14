/**
 * 聊天服务协调器
 * 协调各个 Store 之间的交互，提供统一的聊天功能接口
 */

import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { completions } from '@/apis';
import { generateData, randomTemperature } from '@/models/data';
import { useModel } from '@/models/data';
import { createLogger } from '@/utils/logger';
import { useToast } from 'vue-toast-notification';
import useConfigStore from './config';
import { useSessionStore } from './session';
import { useMessageStore } from './message';
import { useStreamStore } from './stream';
import { useEvaluationStore } from './evaluation';
import type {
  SendMessageOptions,
  Message,
  Session,
  MessageProcessResult
} from '../types/chat';

const logger = createLogger('ChatService');

export const useChatService = defineStore('chatService', {
  state: () => ({
    isProcessing: false,
    processingCount: 0,
  }),

  getters: {
    /**
     * 检查是否有正在处理的消息
     */
    hasProcessingMessages: (state): boolean => {
      return state.processingCount > 0;
    },
  },

  actions: {
    /**
     * 发送文本消息
     */
    async sendMessage(
      text: string, 
      num?: number, 
      formatter: string = '', 
      empowerThink?: boolean, 
      selectedModels: string[] = []
    ): Promise<MessageProcessResult> {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;
      
      if (!session) {
        const error = 'No current session available';
        logger.warn(error);
        return { success: false, error };
      }
      
      try {
        // 格式化消息文本
        const formattedText = messageStore.formatMessage(session.id, text);
        
        // 创建用户消息
        const userMessage: Message = {
          id: messageStore.generateUniqueId(),
          role: 'user',
          content: formattedText,
        };
        
        const messageIndex = session.messages.push(userMessage) - 1;
        
        logger.info('Sending message', { 
          sessionId: session.id, 
          messageId: userMessage.id,
          textLength: formattedText.length 
        });

        // 处理消息
        const result = await this.processMessage(messageIndex, {
          text: formattedText,
          num,
          formatter,
          empowerThink,
          selectedModels,
        });

        return result;

      } catch (error) {
        const errorMessage = `Failed to send message: ${error.message}`;
        logger.error(errorMessage, error);
        return { success: false, error: errorMessage };
      }
    },

    /**
     * 发送图片消息
     */
    async sendImageMessage(
      text: string, 
      imgUrl: string, 
      num?: number
    ): Promise<MessageProcessResult> {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;
      
      if (!session) {
        const error = 'No current session available';
        logger.warn(error);
        return { success: false, error };
      }

      try {
        // 创建用户消息
        const userMessage: Message = {
          id: messageStore.generateUniqueId(),
          role: 'user',
          content: text,
          img: imgUrl,
        };
        
        const messageIndex = session.messages.push(userMessage) - 1;
        
        logger.info('Sending image message', { 
          sessionId: session.id, 
          messageId: userMessage.id,
          hasImage: !!imgUrl 
        });

        // 处理消息
        const result = await this.processMessage(messageIndex, {
          text,
          imgUrl,
          num,
        });

        return result;

      } catch (error) {
        const errorMessage = `Failed to send image message: ${error.message}`;
        logger.error(errorMessage, error);
        return { success: false, error: errorMessage };
      }
    },

    /**
     * 重新生成回复
     */
    async regenerateResponse(messageId: string): Promise<MessageProcessResult> {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;
      
      if (!session) {
        const error = 'No current session available';
        logger.warn(error);
        return { success: false, error };
      }

      const messageIndex = messageStore.getMessageIndex(session.id, messageId);
      if (messageIndex === -1) {
        const error = 'Message not found for regeneration';
        logger.warn(error, { messageId });
        return { success: false, error };
      }

      try {
        const message = session.messages[messageIndex];
        const { img: imgUrl, content: text = '' } = message;
        const nextMessage = session.messages[messageIndex + 1];
        
        // 删除现有的回复
        if (nextMessage?.role === 'assistant') {
          session.messages.splice(messageIndex + 1, 1);
        }
        
        logger.info('Regenerating response', { 
          sessionId: session.id, 
          messageId,
          messageIndex 
        });

        // 重新处理消息
        const targetSession = session.ai?.[1] || session;
        const result = await this.processMessage(
          messageIndex, 
          { text, imgUrl }, 
          targetSession,
          nextMessage
        );

        return result;

      } catch (error) {
        const errorMessage = `Failed to regenerate response: ${error.message}`;
        logger.error(errorMessage, error);
        return { success: false, error: errorMessage };
      }
    },

    /**
     * 核心消息处理逻辑
     */
    async processMessage(
      index: number,
      options: SendMessageOptions,
      targetSession?: Session,
      existingMessage?: Message | null
    ): Promise<MessageProcessResult> {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const streamStore = useStreamStore();
      const evaluationStore = useEvaluationStore();
      const configStore = useConfigStore();
      
      const session = sessionStore.currentSession;
      if (!session) {
        return { success: false, error: 'No current session' };
      }

      const { text, imgUrl, num, formatter = '', empowerThink, selectedModels } = options;
      const qSession = targetSession || session;

      try {
        this.processingCount++;
        
        // 准备消息数据
        const systemMessage = messageStore.getSystemMessage(qSession.id);
        const historyMessages = imgUrl ? [] : messageStore.getHistoryMessages(session.id, index, qSession.id);
        
        const indexMessage = {
          role: 'user',
          content: imgUrl ? [
            { type: 'text', text },
            { type: 'image_url', image_url: { url: imgUrl } }
          ] : text
        };
        
        const combinedMessages = [indexMessage];
        if (historyMessages.length) combinedMessages.unshift(...historyMessages);
        if (systemMessage) combinedMessages.unshift(systemMessage);

        // 获取模型列表
        const models = this.getModelsForRequest(num, existingMessage, selectedModels, qSession);
        let requestDataList = models.map(model => 
          generateData(qSession, combinedMessages, model, formatter)
        );
        requestDataList = randomTemperature(qSession, requestDataList);
        
        // 创建响应消息
        const responseMessage = messageStore.createResponseMessage(
          session.id, 
          index, 
          models, 
          formatter
        );
        
        if (!responseMessage) {
          throw new Error('Failed to create response message');
        }

        // 处理多个响应
        const responsePromises = requestDataList.map(async (data: any, i: number) => {
          const content = responseMessage.multiContent![i];
          
          try {
            // 处理思考增强
            if (empowerThink) {
              await this.handleThinkingEnhancement(data, content, configStore);
            }

            // 执行主要请求
            const response = await completions(data);
            
            if (response.ok) {
              if (data.stream) {
                await streamStore.handleStreamResponse(response, content, session.id);
              } else {
                await streamStore.handleNonStreamResponse(response, content, session.id);
              }
            } else {
              const errorData = await response.json();
              throw new Error(JSON.stringify(errorData, null, 2));
            }

          } catch (error) {
            logger.error('Failed to process response', error, { 
              sessionId: session.id,
              contentIndex: i 
            });
            
            if (content) {
              content.content = `发生错误了捏～：\n\`\`\`json\n${error.message}\n\`\`\``;
              delete content.chatting;
            }
          }
        });

        // 等待所有响应完成
        await Promise.all(responsePromises);
        
        // 清理响应消息状态
        if (responseMessage.multiContent) {
          responseMessage.multiContent.forEach(content => {
            delete content.chatting;
          });
        }
        delete responseMessage.chatting;
        
        // 自动评估会话
        evaluationStore.autoEvaluateIfNeeded(session.id);
        
        logger.info('Message processing completed', { 
          sessionId: session.id,
          messageId: responseMessage.id,
          responseCount: models.length 
        });

        return { 
          success: true, 
          messageId: responseMessage.id 
        };

      } catch (error) {
        const errorMessage = `Message processing failed: ${error.message}`;
        logger.error(errorMessage, error);
        return { success: false, error: errorMessage };
        
      } finally {
        this.processingCount--;
      }
    },

    /**
     * 处理思考增强
     */
    async handleThinkingEnhancement(
      data: any, 
      content: any, 
      configStore: any
    ): Promise<void> {
      try {
        const thinkModelId = configStore.modelConfig[3]?.config?.model || 'gpt-3.5-turbo';
        const thinkResponse = await useModel(thinkModelId).serviceFetch(data);
        
        if (thinkResponse.ok) {
          const streamStore = useStreamStore();
          
          if (data.stream) {
            await streamStore.handleStreamResponse(
              thinkResponse, 
              content, 
              'thinking', 
              { onlyThink: true }
            );
          } else {
            await streamStore.handleNonStreamResponse(thinkResponse, content, 'thinking');
          }
          
          // 将思考内容添加到消息中
          data.messages.push({
            role: 'assistant',
            content: `<thinking>${content.reasoning_content}</thinking>`
          });
        }
      } catch (error) {
        logger.error('Thinking enhancement failed', error);
      }
    },

    /**
     * 获取请求使用的模型列表
     */
    getModelsForRequest(
      num?: number, 
      existingMessage?: Message | null, 
      selectedModels?: string[], 
      session?: Session
    ): string[] {
      const configStore = useConfigStore();
      
      if (selectedModels?.length) {
        return selectedModels;
      }
      
      if (existingMessage?.multiContent?.length) {
        return existingMessage.multiContent.map(mc => mc.model || session?.model || 'gpt-4o');
      }
      
      if (num === 0) {
        return Object.keys(configStore.getModelConfig);
      }
      
      return Array.from({ length: num || 1 }, () => session?.model || 'gpt-4o');
    },

    /**
     * 停止所有处理中的消息
     */
    stopAllProcessing(): void {
      const streamStore = useStreamStore();
      const messageStore = useMessageStore();
      
      streamStore.stopAllStreams();
      messageStore.cleanupProcessingState();
      
      this.processingCount = 0;
      logger.info('All message processing stopped');
    },

    /**
     * 获取处理统计信息
     */
    getProcessingStats() {
      const streamStore = useStreamStore();
      const messageStore = useMessageStore();
      
      return {
        processingCount: this.processingCount,
        streamStats: streamStore.getStreamStats(),
        messageProcessingCount: messageStore.processingCount,
      };
    },
  },
});

export default useChatService;
