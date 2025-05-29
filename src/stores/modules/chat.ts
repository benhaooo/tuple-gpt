import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis";
import { computed, reactive } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import useStream from '@/hooks/stream'
import { generateData, randomTemperature } from "@/models/data"
import { useToast } from 'vue-toast-notification';
import { useModel } from "@/models/data"

// 定义类型
interface Message {
  id: string;
  role: string;
  content?: string;
  img?: string;
  multiContent?: MultiContent[];
  selectedContent?: number;
  chatting?: boolean | any;
}

interface MultiContent {
  id: string;
  content: string;
  reasoning_content?: string;
  chatting?: boolean | any;
  model?: string;
  usage?: any;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  type: string;
  ai: Session[];
  ctxLimit: number;
  locked: boolean;
  role: string;
  model: string;
  format?: string;
  system?: string;
  chatting?: number;
  replyCount?: number;
  clearedCtx?: Message[];
  [key: string]: any; // 允许其他属性
}

interface SystemMessage {
  role: string;
  content: string;
}

interface MessageContent {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
}

interface MessageData {
  model: string;
  messages: any[];
  stream?: boolean;
  [key: string]: any;
}

interface SendMessageOptions {
  text: string;
  imgUrl?: string;
  num?: number;
  formatter?: string;
  empowerThink?: boolean;
  selectedModels?: string[];
}

interface SessionStore {
  sessions: Session[];
  currentSessionId: string;
  askprompt: Record<string, any>;
}

const configStore = useConfigStore();
const { modelConfig, getModelConfig } = storeToRefs(configStore);

// 默认会话配置
const DEFAULT_SESSION: Session = {
  id: "default",
  name: "默认会话",
  messages: [],
  type: "chat",
  ai: [],
  ctxLimit: 5,
  locked: false,
  role: "user",
  model: 'gpt-4o'
};

const useSessionsStore = defineStore('sessions', {
  state: (): SessionStore => ({
    sessions: [{ ...DEFAULT_SESSION }],
    currentSessionId: "default",
    askprompt: {},
  }),

  getters: {
    currentSession: (state): Session | undefined => 
      state.sessions.find(session => session.id === state.currentSessionId),
    
    filterSessions: (state) => (text: string): Session[] => {
      if (!text) return state.sessions;
      
      return state.sessions.filter(session => {
        return session.messages.some(msg => {
          if (msg.content && msg.content.includes(text)) return true;
          
          return msg.multiContent && msg.multiContent.length > 0 && msg.multiContent.some(mc => 
            mc.content.includes(text)
          );
        });
      });
    }
  },

  actions: {
    // =============== 会话管理 ===============
    
    createSession(custom: Partial<Session> = {}): Session {
      const session: Session = {
        id: generateUniqueId(),
        name: custom.name || 'New Chat',
        messages: [],
        type: custom.type || 'chat',
        ai: custom.ai || [],
        ctxLimit: custom.ctxLimit || 5,
        locked: custom.locked || false,
        role: custom.role || 'user',
        model: custom.model || 'gpt-4o'
      };

      // 应用配置
      if (modelConfig.value[0]?.config) {
        Object.assign(session, modelConfig.value[0].config);
      }

      // 覆盖自定义配置
      if (Object.keys(custom).length > 0) {
        Object.assign(session, custom);
      }

      return session;
    },
    
    addSession(custom: Partial<Session> = {}): void {
      const session = this.createSession(custom);
      this.sessions.unshift(session);
      this.currentSessionId = session.id;
    },
    
    addAutoSession(): void {
      const session = this.createSession({
        name: "Mock Chat",
        type: "auto",
        ai: Array(2).fill(null),
      });
      this.sessions.unshift(session);
      this.currentSessionId = session.id;
    },

    autoPushSession(index1: number, index2: number | null, no: number): void {
      const autoSession = this.sessions[index1];
      const session = index2 !== null ? this.sessions[index2] : this.createSession();
      session.role = no === 1 ? "user" : "assistant";
      autoSession.ai[no] = session;
      
      if (index2 !== null) this.deleteSession(index2);
    },
    
    deleteSession(index: number): void {
      const curIndex = this.sessions.findIndex(session => session.id === this.currentSessionId);
      
      if (index === curIndex) {
        if (this.sessions.length === 1) {
          this.sessions[index].messages = [];
          return;
        }
        
        this.currentSessionId = index === this.sessions.length - 1
          ? this.sessions[index - 1].id
          : this.sessions[index + 1].id;
      }
      
      setTimeout(() => {
        this.sessions.splice(index, 1);
      }, 0);
    },
    
    copySession(index: number): void {
      const session = this.sessions[index];
      const newSession = JSON.parse(JSON.stringify(session)) as Session;
      newSession.id = generateUniqueId();
      newSession.name = `${newSession.name} 副本`;
      
      this.sessions.splice(index + 1, 0, newSession);
      this.currentSessionId = newSession.id;
    },

    setCurrentSession(id: string): void {
      this.currentSessionId = id;
    },

    swapSession(index1: number, index2: number): void {
      [this.sessions[index1], this.sessions[index2]] = [this.sessions[index2], this.sessions[index1]];
    },
    
    updateSession(newSession: Session): void {
      const session = this.sessions.find(session => session.id === newSession.id);
      if (session) {
        Object.assign(session, newSession);
      }
    },
    
    toggleLockSession(id: string): void {
      const session = this.sessions.find(session => session.id === id);
      if (session) {
        session.locked = !session.locked;
      }
    },
    
    // =============== 消息管理 ===============
    
    deleteMessage(id: string): void {
      if (!this.currentSession) return;
      this.currentSession.messages = this.currentSession.messages.filter(msg => msg.id !== id);
    },
    
    createMessage(index: number, role: string): void {
      if (!this.currentSession) return;
      
      this.currentSession.messages.splice(index, 0, {
        id: generateUniqueId(),
        role,
        multiContent: [{
          content: "",
          id: generateUniqueId(),
        }],
        selectedContent: 0,
      });
    },
    
    // =============== 消息格式化和准备 ===============
    
    formatMessage({ text }: { text: string }): string {
      if (!this.currentSession) return text;
      
      const template = this.currentSession.format || "";
      const placeholderRegEx = /\${(.*?)}/g;
      
      if (!template || !placeholderRegEx.test(template)) {
        return `${template}${text}`;
      }
      
      return template.replace(placeholderRegEx, text);
    },
    
    getSystemMsg(session: Session): SystemMessage | null {
      return session.system 
        ? { role: "system", content: session.system }
        : null;
    },
    
    getHistoryMsgs(index: number, session: Session, qSession?: Session): { role: string; content: string }[] {
      const reversed = qSession?.role === "user";
      const historyMessages = session.messages.slice(
        Math.max(0, index - session.ctxLimit), 
        index
      );

      return historyMessages.map(msg => ({
        role: reversed 
          ? (msg.role === "assistant" ? "user" : "assistant") 
          : msg.role,
        content: msg.multiContent && typeof msg.selectedContent === 'number'
          ? msg.multiContent[msg.selectedContent].content 
          : (msg.content || ""),
      }));
    },
    
    // =============== 消息发送和处理 ===============
    
    async sendMessage(
      this: any,
      text: string, 
      num?: number, 
      formatter: string = '', 
      empowerThink?: boolean, 
      selectedModels: string[] = []
    ): Promise<void> {
      const session = this.currentSession;
      if (!session) return;
      
      text = this.formatMessage({ text });
      const index = session.messages.push({
        id: generateUniqueId(),
        role: "user",
        content: text,
      }) - 1;
      
      await this.sendMessageInternal(index, { text, num, formatter, empowerThink, selectedModels });
    },
    
    async sendImgMessage(this: any, text: string, imgUrl: string, num?: number): Promise<void> {
      if (!this.currentSession) return;
      
      const index = this.currentSession.messages.push({
        id: generateUniqueId(),
        role: "user",
        content: text,
        img: imgUrl,
      }) - 1;
      
      await this.sendMessageInternal(index, { text, imgUrl, num });
    },
    
    async sendNextMessage(this: any, text: string, num?: number): Promise<void> {
      const session = this.currentSession;
      if (!session) return;
      
      if (!session.ai[0] || !session.ai[1]) {
        useToast().warning('没有填充完全');
        return;
      }
      
      text = this.formatMessage({ text });
      const lastMsg = session.messages[session.messages.length - 1];
      const roleMap = ['user', 'assistant'];
      const no = +(lastMsg?.role === 'user' ? 1 : 0);
      
      const index = session.messages.push({
        id: generateUniqueId(),
        role: roleMap[no],
        content: text,
      }) - 1;
      
      session.chatting = num || session.replyCount || 1;
      
      await this.sendMessageInternal(index, { text, num: 1 }, session.ai[no]);
      if (session.chatting) this.autoChat(session, no);
    },
    
    async reChat(this: any, id: string): Promise<void> {
      const session = this.currentSession;
      if (!session) return;
      
      const index = session.messages.findIndex((msg: Message) => msg.id === id);
      if (index === -1) return;
      
      const { img: imgUrl, content: text = "" } = session.messages[index];
      const nextMsg = session.messages[index + 1];
      
      if (nextMsg?.role === 'assistant') {
        session.messages.splice(index + 1, 1);
      }
      
      await this.sendMessageInternal(index, { text, imgUrl }, session.ai && session.ai[1], nextMsg);
    },
    
    async autoChat(this: any, session: Session, no: number): Promise<void> {
      if (!session.messages.length) return;
      
      const latestIndex = session.messages.length - 1;
      const latestMsg = session.messages[latestIndex];
      const text = latestMsg.content || 
                  (latestMsg.multiContent && 
                   typeof latestMsg.selectedContent === 'number' && 
                   latestMsg.multiContent[latestMsg.selectedContent]?.content) || 
                  "";
      const nextNo = 1 - no;
      
      // 在调用sendMessageInternal前检查角色是否正确
      const roleMap = ['user', 'assistant'];
      if (latestMsg.role !== roleMap[no]) {
        console.warn(`角色不匹配: 当前消息角色 ${latestMsg.role}, 应为 ${roleMap[no]}`);
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
    
    // 消息响应处理
    handleUnStreamMsg(this: any, response: Response, chatting: MultiContent): Promise<void> {
      return response.json().then(res => {
        const content = res.choices[0].message.content;
        chatting.content = content;
        delete chatting.chatting;
      });
    },
    
    handleStreamMsg(
      response: Response, 
      chatting: MultiContent, 
      options: { onlyThink?: boolean } = {}
    ): Promise<void> {
      return new Promise<void>((resolve) => {
        const { streamController } = useStream();
        const controller = streamController(
          response, 
          (content: string, reasoning_content?: string, usage?: any) => {
            if (reasoning_content) chatting.reasoning_content = (chatting.reasoning_content || '') + reasoning_content;
            if (options.onlyThink && content) resolve();
            if (content) chatting.content += content;
            if (usage) chatting.usage = usage;
          }, 
          async () => {
            await delay(800);
            resolve();
          }
        );
        chatting.chatting = controller;
      });
    },
    
    // =============== 会话评估和维护 ===============
    
    async evaluateSession(this: any, session: Session): Promise<void> {
      try {
        const evaluatePrompt = `使用一个emoji和四到六个字直接返回这句话的简要主题，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回"闲聊"`;
        
        const data = {
          model: "gpt-3.5-turbo",
          messages: [
            ...this.getHistoryMsgs(session.messages.length, session),
            {
              role: "system",
              content: evaluatePrompt
            },
          ],
        };

        const modelId = configStore.modelConfig[1].config.model || "gpt-3.5-turbo";
        const response = await useModel(modelId).serviceFetch(data);
        const result = await response.json();
        
        if (result.choices && result.choices[0]) {
          session.name = result.choices[0].message.content;
        }
      } catch (error) {
        console.error('会话评估失败', error);
      }
    },
    
    // 上下文管理
    clearCtx(this: any): void {
      const session = this.currentSession;
      if (!session) return;
      
      if (!session.clearedCtx) {
        session.clearedCtx = [...session.messages];
        session.messages = [];
      } else {
        session.messages.unshift(...session.clearedCtx);
        delete session.clearedCtx;
      }
    },
    
    // =============== 导入导出 ===============
    
    importChat(this: any, e: Event): void {
      try {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.readAsText(file);
        
        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (!e.target?.result) return;
          
          const data = JSON.parse(e.target.result as string) as Session[];
          this.sessions = data;
          this.currentSessionId = this.sessions[0]?.id || "default";
        };
      } catch (error) {
        console.error('导入聊天记录失败', error);
        useToast().error('导入聊天记录失败');
      }
    },
    
    exportChat(this: any): void {
      try {
        const data = JSON.stringify(this.sessions);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'chat.json';
        link.click();
        
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('导出聊天记录失败', error);
        useToast().error('导出聊天记录失败');
      }
    },
    
    clearChat(this: any): void {
      this.sessions = this.sessions.filter((session: Session) => session.locked);
      
      if (!this.sessions.some((session: Session) => session.id === this.currentSessionId)) {
        if (this.sessions.length > 0) {
          this.currentSessionId = this.sessions[0].id;
        } else {
          // 如果没有锁定的会话，创建一个新的默认会话
          this.sessions = [{ ...DEFAULT_SESSION }];
          this.currentSessionId = DEFAULT_SESSION.id;
        }
      }
    },
    
    stopAutoChat(this: any): void {
      const session = this.currentSession;
      if (session?.type === 'auto') {
        session.chatting = 0;
      }
    },
  },
  persist: true,
});

export default useSessionsStore;