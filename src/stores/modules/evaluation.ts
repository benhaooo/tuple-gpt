/**
 * 会话评估 Store
 * 负责会话标题的自动生成和评估
 */

import { defineStore } from 'pinia';
import { createLogger } from '@/utils/logger';
import { useModel } from '@/models/data';
import useConfigStore from './config';
import { useSessionStore } from './session';
import { useMessageStore } from './message';
import type {
  EvaluationStore,
  EvaluationResult
} from '../types/chat';

const logger = createLogger('EvaluationStore');

export const useEvaluationStore = defineStore('evaluation', {
  state: (): EvaluationStore => ({
    evaluationQueue: [],
    isEvaluating: false,
  }),

  getters: {
    /**
     * 获取队列长度
     */
    queueLength: (state): number => {
      return state.evaluationQueue.length;
    },

    /**
     * 检查是否有待评估的会话
     */
    hasPendingEvaluations: (state): boolean => {
      return state.evaluationQueue.length > 0;
    },

    /**
     * 检查指定会话是否在队列中
     */
    isInQueue: (state) => (sessionId: string): boolean => {
      return state.evaluationQueue.includes(sessionId);
    },
  },

  actions: {
    /**
     * 添加会话到评估队列
     */
    queueEvaluation(sessionId: string): void {
      if (!this.evaluationQueue.includes(sessionId)) {
        this.evaluationQueue.push(sessionId);
        logger.debug('Session queued for evaluation', { sessionId });
        
        // 如果当前没有在评估，立即开始
        if (!this.isEvaluating) {
          this.processEvaluationQueue();
        }
      }
    },

    /**
     * 从队列中移除会话
     */
    removeFromQueue(sessionId: string): void {
      const index = this.evaluationQueue.indexOf(sessionId);
      if (index > -1) {
        this.evaluationQueue.splice(index, 1);
        logger.debug('Session removed from evaluation queue', { sessionId });
      }
    },

    /**
     * 处理评估队列
     */
    async processEvaluationQueue(): Promise<void> {
      if (this.isEvaluating || this.evaluationQueue.length === 0) {
        return;
      }

      this.isEvaluating = true;
      logger.info('Starting evaluation queue processing', { 
        queueLength: this.evaluationQueue.length 
      });

      while (this.evaluationQueue.length > 0) {
        const sessionId = this.evaluationQueue.shift()!;
        
        try {
          await this.evaluateSession(sessionId);
        } catch (error) {
          logger.error('Failed to evaluate session', error, { sessionId });
        }
      }

      this.isEvaluating = false;
      logger.info('Evaluation queue processing completed');
    },

    /**
     * 评估单个会话
     */
    async evaluateSession(sessionId: string): Promise<EvaluationResult> {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const configStore = useConfigStore();
      
      const session = sessionStore.getSession(sessionId);
      
      if (!session) {
        const error = 'Session not found for evaluation';
        logger.warn(error, { sessionId });
        return {
          sessionId,
          title: '',
          success: false,
          error,
        };
      }

      // 如果会话没有消息，跳过评估
      if (session.messages.length === 0) {
        logger.debug('Skipping evaluation for empty session', { sessionId });
        return {
          sessionId,
          title: session.name,
          success: true,
        };
      }

      try {
        logger.info('Starting session evaluation', { sessionId });

        sessionStore.emitEvent({
          type: 'evaluation:started',
          timestamp: Date.now(),
          data: { sessionId },
          sessionId,
        });

        const evaluationPrompt = this.buildEvaluationPrompt();
        const historyMessages = messageStore.getHistoryMessages(
          sessionId, 
          session.messages.length
        );

        const requestData = {
          model: 'gpt-3.5-turbo',
          messages: [
            ...historyMessages,
            {
              role: 'system',
              content: evaluationPrompt,
            },
          ],
          max_tokens: 50,
          temperature: 0.3,
        };

        // 获取评估模型
        const modelId = configStore.modelConfig[1]?.config?.model || 'gpt-3.5-turbo';
        const response = await useModel(modelId).serviceFetch(requestData);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        const newTitle = result.choices?.[0]?.message?.content?.trim() || '未命名会话';
        
        // 更新会话标题
        session.name = newTitle;
        
        logger.info('Session evaluation completed', { 
          sessionId, 
          oldTitle: session.name,
          newTitle 
        });

        sessionStore.emitEvent({
          type: 'evaluation:completed',
          timestamp: Date.now(),
          data: { sessionId, title: newTitle },
          sessionId,
        });

        return {
          sessionId,
          title: newTitle,
          success: true,
        };

      } catch (error) {
        const errorMessage = error.message || 'Unknown evaluation error';
        logger.error('Session evaluation failed', error, { sessionId });

        return {
          sessionId,
          title: session.name,
          success: false,
          error: errorMessage,
        };
      }
    },

    /**
     * 构建评估提示词
     */
    buildEvaluationPrompt(): string {
      return `使用一个emoji和四到六个字直接返回这句话的简要主题，不要解释、不要标点、不要语气词、不要多余文本、不要加粗，如果没有主题，请直接返回"闲聊"`;
    },

    /**
     * 批量评估会话
     */
    async batchEvaluate(sessionIds: string[]): Promise<EvaluationResult[]> {
      logger.info('Starting batch evaluation', { count: sessionIds.length });
      
      const results: EvaluationResult[] = [];
      
      for (const sessionId of sessionIds) {
        if (!this.evaluationQueue.includes(sessionId)) {
          this.evaluationQueue.push(sessionId);
        }
      }
      
      await this.processEvaluationQueue();
      
      logger.info('Batch evaluation completed', { count: sessionIds.length });
      return results;
    },

    /**
     * 清空评估队列
     */
    clearQueue(): void {
      const queueLength = this.evaluationQueue.length;
      this.evaluationQueue = [];
      logger.info('Evaluation queue cleared', { clearedCount: queueLength });
    },

    /**
     * 强制停止评估
     */
    stopEvaluation(): void {
      this.isEvaluating = false;
      this.clearQueue();
      logger.info('Evaluation stopped and queue cleared');
    },

    /**
     * 获取评估统计信息
     */
    getEvaluationStats() {
      return {
        isEvaluating: this.isEvaluating,
        queueLength: this.evaluationQueue.length,
        pendingSessionIds: [...this.evaluationQueue],
      };
    },

    /**
     * 检查会话是否需要评估
     */
    needsEvaluation(sessionId: string): boolean {
      const sessionStore = useSessionStore();
      const session = sessionStore.getSession(sessionId);
      
      if (!session) return false;
      
      // 如果会话名称是默认名称且有消息，则需要评估
      const defaultNames = ['New Chat', '默认会话', 'Mock Chat'];
      return defaultNames.includes(session.name) && session.messages.length > 0;
    },

    /**
     * 自动评估会话（如果需要）
     */
    autoEvaluateIfNeeded(sessionId: string): void {
      if (this.needsEvaluation(sessionId)) {
        this.queueEvaluation(sessionId);
      }
    },

    /**
     * 重新评估会话
     */
    async reevaluateSession(sessionId: string): Promise<EvaluationResult> {
      // 从队列中移除（如果存在）
      this.removeFromQueue(sessionId);
      
      // 直接评估
      return await this.evaluateSession(sessionId);
    },
  },
});

export default useEvaluationStore;
