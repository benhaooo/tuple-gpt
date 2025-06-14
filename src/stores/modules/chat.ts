/**
 * 聊天主 Store - 重构版本
 * 现在作为各个专门 Store 的协调器，保持向后兼容性
 */

import { defineStore } from "pinia";
import { computed, reactive } from "vue";
import { useToast } from 'vue-toast-notification';
import { createLogger } from '@/utils/logger';
import { generateUniqueId, delay } from '@/utils/commonUtils';
import { completions } from '@/apis';
import { generateData, randomTemperature, useModel } from '@/models/data';
import useConfigStore from './config';
import useStream from '@/hooks/stream';

// 导入新的模块化 stores
import { useSessionStore } from './session';
import { useMessageStore } from './message';
import { useStreamStore } from './stream';
import { useEvaluationStore } from './evaluation';
import { useChatService } from './chat-service';

// 导入类型定义
import type {
  Message,
  Session,
  SessionStore,
  SendMessageOptions,
  MultiContent,
  SystemMessage,
  MessageContent,
  MessageData
} from '../types/chat';

const logger = createLogger('ChatStore');

/**
 * 主聊天 Store - 作为各个专门 Store 的协调器
 * 保持原有的 API 接口，内部委托给专门的 stores
 */
const useSessionsStore = defineStore('sessions', {
  state: (): SessionStore => {
    // 使用 session store 的状态
    const sessionStore = useSessionStore();
    return {
      sessions: sessionStore.sessions,
      currentSessionId: sessionStore.currentSessionId,
      askprompt: sessionStore.askprompt,
    };
  },

  getters: {
    /**
     * 获取当前会话 - 委托给 session store
     */
    currentSession: (): Session | undefined => {
      const sessionStore = useSessionStore();
      return sessionStore.currentSession;
    },

    /**
     * 过滤会话 - 委托给 session store
     */
    filterSessions: () => (text: string): Session[] => {
      const sessionStore = useSessionStore();
      return sessionStore.filterSessions(text);
    },

    /**
     * 获取会话统计信息
     */
    sessionStats: () => {
      const sessionStore = useSessionStore();
      return sessionStore.sessionStats;
    },

    /**
     * 检查是否有正在处理的消息
     */
    isProcessing: () => {
      const chatService = useChatService();
      return chatService.hasProcessingMessages;
    },
  },

  actions: {
    // =============== 会话管理 - 委托给 session store ===============

    /**
     * 创建会话
     */
    createSession(custom: Partial<Session> = {}): Session {
      const sessionStore = useSessionStore();
      return sessionStore.createSession(custom);
    },

    /**
     * 添加会话
     */
    addSession(custom: Partial<Session> = {}): void {
      const sessionStore = useSessionStore();
      sessionStore.addSession(custom);
      // 同步状态
      this.sessions = sessionStore.sessions;
      this.currentSessionId = sessionStore.currentSessionId;
    },

    /**
     * 添加自动会话
     */
    addAutoSession(): void {
      const sessionStore = useSessionStore();
      sessionStore.addAutoSession();
      // 同步状态
      this.sessions = sessionStore.sessions;
      this.currentSessionId = sessionStore.currentSessionId;
    },

    /**
     * 自动推送会话
     */
    autoPushSession(index1: number, index2: number | null, no: number): void {
      const sessionStore = useSessionStore();
      sessionStore.autoPushSession(index1, index2, no);
      // 同步状态
      this.sessions = sessionStore.sessions;
    },

    /**
     * 删除会话
     */
    deleteSession(index: number): void {
      const sessionStore = useSessionStore();
      sessionStore.deleteSession(index);
      // 同步状态
      this.sessions = sessionStore.sessions;
      this.currentSessionId = sessionStore.currentSessionId;
    },

    /**
     * 复制会话
     */
    copySession(index: number): void {
      const sessionStore = useSessionStore();
      sessionStore.copySession(index);
      // 同步状态
      this.sessions = sessionStore.sessions;
      this.currentSessionId = sessionStore.currentSessionId;
    },

    /**
     * 设置当前会话
     */
    setCurrentSession(id: string): void {
      const sessionStore = useSessionStore();
      sessionStore.setCurrentSession(id);
      // 同步状态
      this.currentSessionId = sessionStore.currentSessionId;
    },

    /**
     * 交换会话
     */
    swapSession(index1: number, index2: number): void {
      const sessionStore = useSessionStore();
      sessionStore.swapSession(index1, index2);
      // 同步状态
      this.sessions = sessionStore.sessions;
    },

    /**
     * 更新会话
     */
    updateSession(newSession: Session): void {
      const sessionStore = useSessionStore();
      sessionStore.updateSession(newSession);
      // 同步状态
      this.sessions = sessionStore.sessions;
    },

    /**
     * 切换会话锁定状态
     */
    toggleLockSession(id: string): void {
      const sessionStore = useSessionStore();
      sessionStore.toggleLockSession(id);
      // 同步状态
      this.sessions = sessionStore.sessions;
    },

    // =============== 消息管理 - 委托给 message store ===============

    /**
     * 删除消息
     */
    deleteMessage(id: string): void {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;

      if (!session) return;

      messageStore.deleteMessage(session.id, id);
      logger.debug('Message deleted via chat store', { messageId: id });
    },

    /**
     * 创建消息
     */
    createMessage(index: number, role: string): void {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;

      if (!session) return;

      messageStore.createMessage(session.id, index, role);
      logger.debug('Message created via chat store', { index, role });
    },

    // =============== 消息格式化和准备 - 委托给 message store ===============

    /**
     * 格式化消息
     */
    formatMessage({ text }: { text: string }): string {
      const sessionStore = useSessionStore();
      const messageStore = useMessageStore();
      const session = sessionStore.currentSession;

      if (!session) return text;

      return messageStore.formatMessage(session.id, text);
    },

    /**
     * 获取系统消息
     */
    getSystemMsg(session: Session): SystemMessage | null {
      const messageStore = useMessageStore();
      return messageStore.getSystemMessage(session.id);
    },

    /**
     * 获取历史消息
     */
    getHistoryMsgs(index: number, session: Session, qSession?: Session): { role: string; content: string }[] {
      const messageStore = useMessageStore();
      return messageStore.getHistoryMessages(session.id, index, qSession?.id);
    },

    // =============== 消息发送和处理 - 委托给 chat service ===============

    /**
     * 发送消息
     */
    async sendMessage(
      text: string,
      num?: number,
      formatter: string = '',
      empowerThink?: boolean,
      selectedModels: string[] = []
    ): Promise<void> {
      const chatService = useChatService();

      try {
        const result = await chatService.sendMessage(text, num, formatter, empowerThink, selectedModels);

        if (!result.success) {
          logger.error('Failed to send message', { error: result.error });
          useToast().error(`发送消息失败: ${result.error}`);
        }
      } catch (error) {
        logger.error('Send message error', error);
        useToast().error('发送消息时发生错误');
      }
    },

    /**
     * 发送图片消息
     */
    async sendImgMessage(text: string, imgUrl: string, num?: number): Promise<void> {
      const chatService = useChatService();

      try {
        const result = await chatService.sendImageMessage(text, imgUrl, num);

        if (!result.success) {
          logger.error('Failed to send image message', { error: result.error });
          useToast().error(`发送图片消息失败: ${result.error}`);
        }
      } catch (error) {
        logger.error('Send image message error', error);
        useToast().error('发送图片消息时发生错误');
      }
    },

    /**
     * 发送下一条消息（自动聊天）
     */
    async sendNextMessage(text: string, num?: number): Promise<void> {
      const sessionStore = useSessionStore();
      const session = sessionStore.currentSession;

      if (!session) return;

      if (!session.ai[0] || !session.ai[1]) {
        useToast().warning('没有填充完全');
        return;
      }

      // 这里保持原有逻辑，因为涉及到复杂的自动聊天状态管理
      const formattedText = this.formatMessage({ text });
      const lastMsg = session.messages[session.messages.length - 1];
      const roleMap = ['user', 'assistant'];
      const no = +(lastMsg?.role === 'user' ? 1 : 0);

      // 创建消息
      const newMessage: Message = {
        id: generateUniqueId(),
        role: roleMap[no],
        content: formattedText,
      };

      const index = session.messages.push(newMessage) - 1;
      session.chatting = num || session.replyCount || 1;

      // 使用内部处理逻辑
      await this.sendMessageInternal(index, { text: formattedText, num: 1 }, session.ai[no]);
      if (session.chatting) this.autoChat(session, no);
    },

    /**
     * 重新生成回复
     */
    async reChat(id: string): Promise<void> {
      const chatService = useChatService();

      try {
        const result = await chatService.regenerateResponse(id);

        if (!result.success) {
          logger.error('Failed to regenerate response', { error: result.error });
          useToast().error(`重新生成回复失败: ${result.error}`);
        }
      } catch (error) {
        logger.error('Regenerate response error', error);
        useToast().error('重新生成回复时发生错误');
      }
    },

    /**
     * 自动聊天
     */
    async autoChat(session: Session, no: number): Promise<void> {
      if (!session.messages.length) return;

      const latestIndex = session.messages.length - 1;
      const latestMsg = session.messages[latestIndex];
      const text = latestMsg.content ||
                  (latestMsg.multiContent &&
                   typeof latestMsg.selectedContent === 'number' &&
                   latestMsg.multiContent[latestMsg.selectedContent]?.content) ||
                  "";
      const nextNo = 1 - no;

      // 检查角色是否正确
      const roleMap = ['user', 'assistant'];
      if (latestMsg.role !== roleMap[no]) {
        logger.warn('Role mismatch in auto chat', {
          currentRole: latestMsg.role,
          expectedRole: roleMap[no]
        });
      }

      await this.sendMessageInternal(latestIndex, { text }, session.ai[nextNo]);

      if (session.chatting) {
        this.autoChat(session, nextNo);
      }
    },
    
    // 核心消息处理逻辑
    async sendMessageInternal(
      this: any,
      index: number, 
      options: SendMessageOptions, 
      qSession: Session = this.currentSession as Session, 
      nextMsg: Message | null = null
    ): Promise<void> {
      const { text, imgUrl, num, formatter = '', empowerThink, selectedModels } = options;
      const session = this.currentSession;
      if (!session) return;
      
      // 准备消息
      const systemMessage = this.getSystemMsg(qSession);
      const historyMessages = imgUrl ? [] : this.getHistoryMsgs(index, session, qSession);
      
      const indexMsg: { role: string; content: string | MessageContent[] } = {
        role: "user",
        content: imgUrl ? [
          { type: "text", text },
          { type: "image_url", image_url: { url: imgUrl } }
        ] : text
      };
      
      const combinedMessages = [indexMsg];
      if (historyMessages.length) combinedMessages.unshift(...historyMessages);
      if (systemMessage) combinedMessages.unshift(systemMessage);

      // 获取模型配置
      const getModels = (num?: number, nextMsg?: Message | null, selectedModels?: string[]): string[] => {
        if (selectedModels?.length) {
          return selectedModels;
        }
        
        if (nextMsg?.multiContent?.length) {
          return nextMsg.multiContent.map(mc => mc.model || qSession.model);
        }
        
        if (num === 0) {
          return Object.keys(getModelConfig.value);
        }
        
        return Array.from({ length: num || 1 }, () => qSession.model);
      };
      
      const models = getModels(num, nextMsg, selectedModels);
      let datas = models.map(model => generateData(qSession, combinedMessages, model, formatter || ''));
      datas = randomTemperature(qSession, datas);
      
      // 创建响应消息
      const chattingMsg: Message = reactive({
        id: generateUniqueId(),
        role: "assistant",
        selectedContent: 0,
        multiContent: datas.map(data => ({ 
          content: formatter || '', 
          reasoning_content: '', 
          chatting: true, 
          id: generateUniqueId(), 
          model: data.model 
        })),
        chatting: true
      });
      
      session.messages.splice(index + 1, 0, chattingMsg);
      
      // 处理多个响应
      const responses = datas.map(async (data: any, i: number) => {
        try {
          // 处理思考能力增强
          if (empowerThink) {
            try {
              const thinkModelId = configStore.modelConfig[3].config.model || "gpt-3.5-turbo";
              const thinkResponse = await useModel(thinkModelId).serviceFetch(data);
              
              if (thinkResponse.ok) {
                await (data.stream 
                  ? this.handleStreamMsg(thinkResponse, chattingMsg.multiContent![i], { onlyThink: true }) 
                  : this.handleUnStreamMsg(thinkResponse, chattingMsg.multiContent![i])
                );
                
                data.messages.push({
                  role: "assistant",
                  content: `<thinking>${chattingMsg.multiContent![i].reasoning_content}</thinking>`
                });
              }
            } catch (error) {
              console.error('思考能力增强处理错误', error);
            }
          }

          // 执行常规请求
          const response = await completions(data);
          
          if (response.ok) {
            await (data.stream 
              ? this.handleStreamMsg(response, chattingMsg.multiContent![i]) 
              : this.handleUnStreamMsg(response, chattingMsg.multiContent![i])
            );
          } else {
            const errorMsg = await response.json();
            throw new Error(JSON.stringify(errorMsg, null, 2));
          }
        } catch (error: any) {
          if (chattingMsg.multiContent?.[i]) {
            chattingMsg.multiContent[i].content = `发生错误了捏～：\n\`\`\`json\n${error.message}\n\`\`\``;
          }
        }
      });

      // 等待所有响应完成
      await Promise.all(responses);
      
      // 评估会话
      await this.evaluateSession(session);
      
      // 清理状态
      if (chattingMsg.multiContent) {
        chattingMsg.multiContent.forEach(content => {
          delete content.chatting;
        });
      }
      
      delete chattingMsg.chatting;
      if (typeof session.chatting === 'number') {
        session.chatting--;
      }
    },

    // =============== 流处理 - 委托给 stream store ===============

    /**
     * 处理非流式响应 - 保持向后兼容
     */
    handleUnStreamMsg(response: Response, chatting: MultiContent): Promise<void> {
      const streamStore = useStreamStore();
      return streamStore.handleNonStreamResponse(response, chatting, 'legacy');
    },

    /**
     * 处理流式响应 - 保持向后兼容
     */
    handleStreamMsg(
      response: Response,
      chatting: MultiContent,
      options: { onlyThink?: boolean } = {}
    ): Promise<void> {
      const streamStore = useStreamStore();
      return streamStore.handleStreamResponse(response, chatting, 'legacy', options);
    },

    // =============== 会话评估 - 委托给 evaluation store ===============

    /**
     * 评估会话 - 委托给 evaluation store
     */
    async evaluateSession(session: Session): Promise<void> {
      const evaluationStore = useEvaluationStore();

      try {
        const result = await evaluationStore.evaluateSession(session.id);
        if (result.success && result.title) {
          session.name = result.title;
        }
      } catch (error) {
        logger.error('Session evaluation failed', error, { sessionId: session.id });
      }
    },

    // =============== 上下文管理 ===============

    /**
     * 清理上下文
     */
    clearCtx(): void {
      const sessionStore = useSessionStore();
      const session = sessionStore.currentSession;
      if (!session) return;

      if (!session.clearedCtx) {
        session.clearedCtx = [...session.messages];
        session.messages = [];
        logger.info('Context cleared', { sessionId: session.id });
      } else {
        session.messages.unshift(...session.clearedCtx);
        delete session.clearedCtx;
        logger.info('Context restored', { sessionId: session.id });
      }
    },

    // =============== 导入导出 ===============

    /**
     * 导入聊天记录
     */
    importChat(e: Event): void {
      const sessionStore = useSessionStore();

      try {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (!e.target?.result) return;

          try {
            const data = JSON.parse(e.target.result as string) as Session[];

            // 验证数据格式
            if (!Array.isArray(data)) {
              throw new Error('Invalid chat data format');
            }

            // 更新 session store
            sessionStore.sessions = data;
            sessionStore.currentSessionId = data[0]?.id || 'default';

            // 同步到当前 store
            this.sessions = sessionStore.sessions;
            this.currentSessionId = sessionStore.currentSessionId;

            logger.info('Chat imported successfully', { sessionCount: data.length });
            useToast().success('聊天记录导入成功');

          } catch (parseError) {
            logger.error('Failed to parse imported chat data', parseError);
            useToast().error('聊天记录格式错误');
          }
        };
      } catch (error) {
        logger.error('Import chat failed', error);
        useToast().error('导入聊天记录失败');
      }
    },

    /**
     * 导出聊天记录
     */
    exportChat(): void {
      const sessionStore = useSessionStore();

      try {
        const exportData = {
          version: '1.0',
          timestamp: Date.now(),
          sessions: sessionStore.sessions,
          metadata: {
            totalSessions: sessionStore.sessions.length,
            totalMessages: sessionStore.sessions.reduce((sum, s) => sum + s.messages.length, 0),
            exportedBy: 'Tuple-GPT',
          },
        };

        const data = JSON.stringify(exportData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);

        logger.info('Chat exported successfully', {
          sessionCount: exportData.sessions.length,
          messageCount: exportData.metadata.totalMessages
        });
        useToast().success('聊天记录导出成功');

      } catch (error) {
        logger.error('Export chat failed', error);
        useToast().error('导出聊天记录失败');
      }
    },

    /**
     * 清理聊天记录
     */
    clearChat(): void {
      const sessionStore = useSessionStore();
      sessionStore.clearUnlockedSessions();

      // 同步状态
      this.sessions = sessionStore.sessions;
      this.currentSessionId = sessionStore.currentSessionId;

      logger.info('Chat cleared');
      useToast().success('聊天记录已清理');
    },

    /**
     * 停止自动聊天
     */
    stopAutoChat(): void {
      const sessionStore = useSessionStore();
      const session = sessionStore.currentSession;

      if (session?.type === 'auto') {
        session.chatting = 0;
        logger.info('Auto chat stopped', { sessionId: session.id });
      }
    },
  },
  persist: true,
});

export default useSessionsStore;