/**
 * 会话管理相关的 Composable
 * 提供会话操作的响应式接口
 */

import { ref, computed, watch } from 'vue';
import { createLogger } from '@/utils/logger';
import { useSessionStore } from '@/stores/modules/session';
import { useEvaluationStore } from '@/stores/modules/evaluation';
import type { UseSessionReturn } from './types';
import type { Session } from '@/stores/types/chat';

const logger = createLogger('UseSession');

/**
 * 会话管理 Composable
 */
export function useSession(): UseSessionReturn {
  // 状态
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // Store 实例
  const sessionStore = useSessionStore();
  const evaluationStore = useEvaluationStore();

  // 响应式状态
  const sessions = computed(() => sessionStore.sessions);
  const currentSession = computed(() => sessionStore.currentSession);

  /**
   * 清除错误
   */
  const clearError = (): void => {
    error.value = null;
  };

  /**
   * 创建会话
   */
  const createSession = async (options: Partial<Session> = {}): Promise<Session | null> => {
    isLoading.value = true;
    clearError();

    try {
      logger.debug('Creating session', options);

      const sessionId = sessionStore.addSession(options);
      const session = sessionStore.getSession(sessionId);
      
      if (session) {
        logger.info('Session created successfully', { sessionId: session.id });
        return session;
      } else {
        throw new Error('Failed to create session');
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to create session';
      error.value = errorMessage;
      logger.error('Create session error', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 删除会话
   */
  const deleteSession = async (sessionId: string): Promise<boolean> => {
    isLoading.value = true;
    clearError();

    try {
      logger.debug('Deleting session', { sessionId });

      const index = sessionStore.getSessionIndex(sessionId);
      if (index === -1) {
        throw new Error('Session not found');
      }

      sessionStore.deleteSession(index);
      logger.info('Session deleted successfully', { sessionId });
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Failed to delete session';
      error.value = errorMessage;
      logger.error('Delete session error', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 更新会话
   */
  const updateSession = async (session: Session): Promise<boolean> => {
    isLoading.value = true;
    clearError();

    try {
      logger.debug('Updating session', { sessionId: session.id });

      const success = sessionStore.updateSession(session);
      
      if (success) {
        logger.info('Session updated successfully', { sessionId: session.id });
        return true;
      } else {
        throw new Error('Failed to update session');
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to update session';
      error.value = errorMessage;
      logger.error('Update session error', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 切换会话
   */
  const switchSession = async (sessionId: string): Promise<boolean> => {
    clearError();

    try {
      logger.debug('Switching session', { sessionId });

      const success = sessionStore.setCurrentSession(sessionId);
      
      if (success) {
        logger.info('Session switched successfully', { sessionId });
        return true;
      } else {
        throw new Error('Session not found');
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to switch session';
      error.value = errorMessage;
      logger.error('Switch session error', err);
      return false;
    }
  };

  /**
   * 复制会话
   */
  const duplicateSession = async (sessionId: string): Promise<Session | null> => {
    isLoading.value = true;
    clearError();

    try {
      logger.debug('Duplicating session', { sessionId });

      const index = sessionStore.getSessionIndex(sessionId);
      if (index === -1) {
        throw new Error('Session not found');
      }

      const newSessionId = sessionStore.copySession(index);
      const newSession = sessionStore.getSession(newSessionId!);
      
      if (newSession) {
        logger.info('Session duplicated successfully', { 
          originalId: sessionId,
          newId: newSession.id 
        });
        return newSession;
      } else {
        throw new Error('Failed to duplicate session');
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to duplicate session';
      error.value = errorMessage;
      logger.error('Duplicate session error', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 搜索会话
   */
  const searchSessions = (query: string): Session[] => {
    try {
      logger.debug('Searching sessions', { query });
      
      const results = sessionStore.filterSessions(query);
      
      logger.debug('Search completed', { 
        query, 
        resultCount: results.length 
      });
      
      return results;

    } catch (err) {
      logger.error('Search sessions error', err);
      return [];
    }
  };

  return {
    // 状态
    sessions,
    currentSession,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // 方法
    createSession,
    deleteSession,
    updateSession,
    switchSession,
    duplicateSession,
    searchSessions,
    clearError,
  };
}

/**
 * 会话快捷操作 Composable
 */
export function useSessionActions() {
  const session = useSession();
  const sessionStore = useSessionStore();
  const evaluationStore = useEvaluationStore();

  /**
   * 创建默认会话
   */
  const createDefaultSession = async (): Promise<Session | null> => {
    // 不传递 name 和其他参数，让 createSession 使用默认配置
    return await session.createSession({
      type: 'chat',
    });
  };

  /**
   * 创建自动聊天会话
   */
  const createAutoSession = async (): Promise<Session | null> => {
    return await session.createSession({
      name: 'Auto Chat',
      type: 'auto',
      ai: Array(2).fill(null),
    });
  };

  /**
   * 锁定/解锁会话
   */
  const toggleSessionLock = async (sessionId: string): Promise<boolean> => {
    try {
      sessionStore.toggleLockSession(sessionId);
      logger.info('Session lock toggled', { sessionId });
      return true;
    } catch (err) {
      logger.error('Toggle session lock error', err);
      return false;
    }
  };

  /**
   * 清理未锁定的会话
   */
  const clearUnlockedSessions = async (): Promise<void> => {
    try {
      sessionStore.clearUnlockedSessions();
      logger.info('Unlocked sessions cleared');
    } catch (err) {
      logger.error('Clear unlocked sessions error', err);
    }
  };

  /**
   * 评估会话标题
   */
  const evaluateSessionTitle = async (sessionId: string): Promise<boolean> => {
    try {
      const result = await evaluationStore.evaluateSession(sessionId);
      return result.success;
    } catch (err) {
      logger.error('Evaluate session title error', err);
      return false;
    }
  };

  /**
   * 批量评估会话
   */
  const batchEvaluateSessions = async (sessionIds: string[]): Promise<void> => {
    try {
      await evaluationStore.batchEvaluate(sessionIds);
      logger.info('Batch evaluation completed', { count: sessionIds.length });
    } catch (err) {
      logger.error('Batch evaluate sessions error', err);
    }
  };

  return {
    ...session,
    createDefaultSession,
    createAutoSession,
    toggleSessionLock,
    clearUnlockedSessions,
    evaluateSessionTitle,
    batchEvaluateSessions,
  };
}

/**
 * 会话统计 Composable
 */
export function useSessionStats() {
  const sessionStore = useSessionStore();

  const stats = computed(() => sessionStore.sessionStats);
  
  const totalSessions = computed(() => stats.value.totalSessions);
  const activeSessions = computed(() => stats.value.activeSessions);
  const lockedSessions = computed(() => stats.value.lockedSessions);
  const averageMessages = computed(() => stats.value.averageMessagesPerSession);

  return {
    stats,
    totalSessions,
    activeSessions,
    lockedSessions,
    averageMessages,
  };
}
