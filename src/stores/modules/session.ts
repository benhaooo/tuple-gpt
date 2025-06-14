/**
 * 会话管理 Store
 * 负责会话的创建、删除、更新、切换等操作
 */

import { defineStore } from 'pinia';
import { computed } from 'vue';
import { generateUniqueId } from '@/utils/commonUtils';
import { DEFAULT_VALUES } from '@/constants';
import { createLogger } from '@/utils/logger';
import type {
  Session,
  SessionStore,
  SessionCreateOptions,
  SessionStats,
  ChatEvent
} from '../types/chat';

const logger = createLogger('SessionStore');

// 默认会话配置
const DEFAULT_SESSION: Session = {
  id: 'default',
  name: DEFAULT_VALUES.SESSION_NAME,
  messages: [],
  type: 'chat',
  ai: [],
  ctxLimit: DEFAULT_VALUES.CONTEXT_LIMIT,
  locked: false,
  role: 'user',
  model: 'gpt-4o'
};

export const useSessionStore = defineStore('session', {
  state: (): SessionStore => ({
    sessions: [{ ...DEFAULT_SESSION }],
    currentSessionId: 'default',
    askprompt: {},
  }),

  getters: {
    /**
     * 获取当前会话
     */
    currentSession: (state): Session | undefined => {
      return state.sessions.find(session => session.id === state.currentSessionId);
    },

    /**
     * 获取会话总数
     */
    sessionCount: (state): number => {
      return state.sessions.length;
    },

    /**
     * 获取锁定的会话
     */
    lockedSessions: (state): Session[] => {
      return state.sessions.filter(session => session.locked);
    },

    /**
     * 获取活跃会话（有消息的会话）
     */
    activeSessions: (state): Session[] => {
      return state.sessions.filter(session => session.messages.length > 0);
    },

    /**
     * 根据文本过滤会话
     */
    filterSessions: (state) => (text: string): Session[] => {
      if (!text) return state.sessions;
      
      return state.sessions.filter(session => {
        // 搜索会话名称
        if (session.name.includes(text)) return true;
        
        // 搜索消息内容
        return session.messages.some(msg => {
          if (msg.content && msg.content.includes(text)) return true;
          
          return msg.multiContent && msg.multiContent.length > 0 && 
                 msg.multiContent.some(mc => mc.content.includes(text));
        });
      });
    },

    /**
     * 获取会话统计信息
     */
    sessionStats: (state): SessionStats => {
      const sessions = state.sessions;
      const now = new Date();
      
      return {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.messages.length > 0).length,
        lockedSessions: sessions.filter(s => s.locked).length,
        averageMessagesPerSession: sessions.reduce((sum, s) => sum + s.messages.length, 0) / sessions.length,
        oldestSession: new Date(Math.min(...sessions.map(s => new Date(s.id).getTime() || now.getTime()))),
        newestSession: new Date(Math.max(...sessions.map(s => new Date(s.id).getTime() || now.getTime()))),
      };
    },
  },

  actions: {
    /**
     * 创建新会话
     */
    createSession(options: SessionCreateOptions = {}): Session {
      logger.info('Creating new session', options);
      
      const session: Session = {
        id: generateUniqueId(),
        name: options.name || DEFAULT_VALUES.SESSION_NAME,
        messages: [],
        type: options.type || 'chat',
        ai: options.ai || [],
        ctxLimit: options.ctxLimit || DEFAULT_VALUES.CONTEXT_LIMIT,
        locked: options.locked || false,
        role: options.role || 'user',
        model: options.model || 'gpt-4o',
        ...options
      };

      this.emitEvent({
        type: 'session:created',
        timestamp: Date.now(),
        data: session,
        sessionId: session.id,
      });

      return session;
    },

    /**
     * 添加会话到列表
     */
    addSession(options: SessionCreateOptions = {}): string {
      const session = this.createSession(options);
      this.sessions.unshift(session);
      this.currentSessionId = session.id;
      
      logger.info('Session added', { sessionId: session.id, name: session.name });
      return session.id;
    },

    /**
     * 添加自动聊天会话
     */
    addAutoSession(): string {
      const sessionId = this.addSession({
        name: 'Mock Chat',
        type: 'auto',
        ai: Array(2).fill(null),
      });
      
      logger.info('Auto session added', { sessionId });
      return sessionId;
    },

    /**
     * 删除会话
     */
    deleteSession(index: number): void {
      if (index < 0 || index >= this.sessions.length) {
        logger.warn('Invalid session index for deletion', { index });
        return;
      }

      const session = this.sessions[index];
      const curIndex = this.sessions.findIndex(s => s.id === this.currentSessionId);
      
      logger.info('Deleting session', { sessionId: session.id, index });

      // 如果删除的是当前会话
      if (index === curIndex) {
        if (this.sessions.length === 1) {
          // 如果只有一个会话，清空消息而不删除
          this.sessions[index].messages = [];
          logger.info('Cleared last session messages instead of deleting');
          return;
        }
        
        // 切换到相邻会话
        this.currentSessionId = index === this.sessions.length - 1
          ? this.sessions[index - 1].id
          : this.sessions[index + 1].id;
      }
      
      this.emitEvent({
        type: 'session:deleted',
        timestamp: Date.now(),
        data: session,
        sessionId: session.id,
      });

      // 延迟删除以避免响应式更新问题
      setTimeout(() => {
        this.sessions.splice(index, 1);
      }, 0);
    },

    /**
     * 复制会话
     */
    copySession(index: number): string | null {
      if (index < 0 || index >= this.sessions.length) {
        logger.warn('Invalid session index for copying', { index });
        return null;
      }

      const session = this.sessions[index];
      const newSession = JSON.parse(JSON.stringify(session)) as Session;
      newSession.id = generateUniqueId();
      newSession.name = `${newSession.name} 副本`;
      
      this.sessions.splice(index + 1, 0, newSession);
      this.currentSessionId = newSession.id;
      
      logger.info('Session copied', { 
        originalId: session.id, 
        newId: newSession.id 
      });

      this.emitEvent({
        type: 'session:created',
        timestamp: Date.now(),
        data: newSession,
        sessionId: newSession.id,
      });

      return newSession.id;
    },

    /**
     * 设置当前会话
     */
    setCurrentSession(id: string): boolean {
      const session = this.sessions.find(s => s.id === id);
      if (!session) {
        logger.warn('Session not found', { sessionId: id });
        return false;
      }

      this.currentSessionId = id;
      logger.debug('Current session changed', { sessionId: id });
      return true;
    },

    /**
     * 交换会话位置
     */
    swapSession(index1: number, index2: number): boolean {
      if (index1 < 0 || index1 >= this.sessions.length ||
          index2 < 0 || index2 >= this.sessions.length) {
        logger.warn('Invalid session indices for swapping', { index1, index2 });
        return false;
      }

      [this.sessions[index1], this.sessions[index2]] = 
      [this.sessions[index2], this.sessions[index1]];
      
      logger.debug('Sessions swapped', { index1, index2 });
      return true;
    },

    /**
     * 更新会话
     */
    updateSession(newSession: Session): boolean {
      const index = this.sessions.findIndex(s => s.id === newSession.id);
      if (index === -1) {
        logger.warn('Session not found for update', { sessionId: newSession.id });
        return false;
      }

      Object.assign(this.sessions[index], newSession);
      
      this.emitEvent({
        type: 'session:updated',
        timestamp: Date.now(),
        data: newSession,
        sessionId: newSession.id,
      });

      logger.debug('Session updated', { sessionId: newSession.id });
      return true;
    },

    /**
     * 切换会话锁定状态
     */
    toggleLockSession(id: string): boolean {
      const session = this.sessions.find(s => s.id === id);
      if (!session) {
        logger.warn('Session not found for lock toggle', { sessionId: id });
        return false;
      }

      session.locked = !session.locked;
      logger.info('Session lock toggled', { 
        sessionId: id, 
        locked: session.locked 
      });
      return true;
    },

    /**
     * 自动推送会话
     */
    autoPushSession(index1: number, index2: number | null, no: number): boolean {
      if (index1 < 0 || index1 >= this.sessions.length) {
        logger.warn('Invalid auto session index', { index1 });
        return false;
      }

      const autoSession = this.sessions[index1];
      const session = index2 !== null ? this.sessions[index2] : this.createSession();
      
      session.role = no === 1 ? 'user' : 'assistant';
      autoSession.ai[no] = session;
      
      if (index2 !== null) {
        this.deleteSession(index2);
      }
      
      logger.info('Auto session pushed', { index1, index2, no });
      return true;
    },

    /**
     * 清理所有未锁定的会话
     */
    clearUnlockedSessions(): void {
      const beforeCount = this.sessions.length;
      this.sessions = this.sessions.filter(session => session.locked);
      
      // 确保当前会话仍然存在
      if (!this.sessions.some(s => s.id === this.currentSessionId)) {
        if (this.sessions.length > 0) {
          this.currentSessionId = this.sessions[0].id;
        } else {
          // 如果没有锁定的会话，创建一个新的默认会话
          this.sessions = [{ ...DEFAULT_SESSION }];
          this.currentSessionId = DEFAULT_SESSION.id;
        }
      }
      
      const afterCount = this.sessions.length;
      logger.info('Unlocked sessions cleared', { 
        before: beforeCount, 
        after: afterCount 
      });
    },

    /**
     * 获取会话索引
     */
    getSessionIndex(id: string): number {
      return this.sessions.findIndex(s => s.id === id);
    },

    /**
     * 获取会话
     */
    getSession(id: string): Session | undefined {
      return this.sessions.find(s => s.id === id);
    },

    /**
     * 发出事件
     */
    emitEvent(event: ChatEvent): void {
      // 这里可以集成事件总线或者其他事件处理机制
      logger.debug('Event emitted', event);
    },
  },

  persist: {
    key: 'tuple-gpt-sessions',
    storage: localStorage,
  },
});

export default useSessionStore;
