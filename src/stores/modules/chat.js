import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis";
import { computed, reactive } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import useStream from '@/hooks/stream'

const configStore = useConfigStore();
const { moduleConfig } = storeToRefs(configStore);

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [],
        currentSessionId: "",
        askprompt: {},
    }),
    getters: {
        currentSession: (state) => state.sessions.find(session => session.id === state.currentSessionId),
        filterSessions: (state) => {
            return (text) => {
                if (!text) return state.sessions
                return state.sessions.filter(session => {
                    return session.messages.some(msg => {
                        return msg.content.includes(text)
                    })
                })
            }
        }
    },
    actions: {
        // 新增会话
        addSession({ name, prompt }) {
            const session = {
                id: generateUniqueId(),
                messages: [],
                ...moduleConfig.value,
                name,
                system: prompt
            };
            this.sessions.unshift(session);
            this.currentSessionId = session.id;
        },

        // 删除会话
        deleteSession(index) {
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
            this.sessions.splice(index, 1);
        },

        setCurrentSession(id) {
            this.currentSessionId = id;
        },

        // 修改会话配置
        updateSession(sessionConfig) {
            const curIndex = this.sessions.findIndex(session => session.id === this.currentSessionId);
            this.sessions[curIndex] = {
                ...this.sessions[curIndex],
                ...sessionConfig
            };
        },

        // 删除消息
        deleteMessage(index) {
            this.currentSession.messages.splice(index, 1);
        },

        // 重新交流
        async reChat(index) {
            const { img: imgUrl, content: text } = this.currentSession.messages[index];
            const nextMsg = this.currentSession.messages[index + 1];
            await this.sendMessageInternal(index, { text, imgUrl }, nextMsg);
        },

        // 发送图片消息
        async sendImgMessage(text, imgUrl) {
            const index = this.currentSession.messages.push({
                role: "user",
                content: text,
                img: imgUrl,
            });
            await this.sendMessageInternal(index, { text, imgUrl });
        },

        // 获取上下文
        getHistoryMsgs(index) {
            const session = this.currentSession;
            const historyMessages = session.messages.slice(0, index);
            return historyMessages.map(msg => ({
                role: msg.role,
                content: msg.multiContent ? msg.multiContent[msg.selectedContent].content : msg.content,
            }));
        },

        // 发送消息
        async sendMessage(text) {
            const index = this.currentSession.messages.push({
                role: "user",
                content: text,
            });
            await this.sendMessageInternal(index, { text });
        },

        async sendMessageInternal(index, { text, imgUrl }, nextMsg = null) {
            const session = this.currentSession;
            if (!session.model) session.model = "gpt-3.5-turbo";
            if (imgUrl) session.model = "gpt-4o";

            const systemMessage = this.getSystemMsg();
            const historyMessages = this.getHistoryMsgs(index)
            const indexMsg = {
                role: "user",
                content: imgUrl ? [
                    { type: "text", text: msg.content },
                    { type: "image_url", image_url: { url: msg.img } }
                ] : text
            }
            const combinedMessages = [indexMsg];
            if (systemMessage) combinedMessages.unshift(systemMessage);
            if (historyMessages) combinedMessages.unshift(...historyMessages)

            const data = {
                model: session.model,
                messages: combinedMessages,
                stream: true,
                max_tokens: session.maxTokens,
                temperature: session.temperature,
                top_p: session.top_p,
                presence_penalty: session.presence_penalty,
                frequency_penalty: session.frequency_penalty,
            };
            const chattingMsg = (() => {
                const initMultiContent = () => Array.from({ length: session.replyCount }, () => ({ content: "", chatting: true }));
                if (nextMsg && nextMsg.role === "assistant") {
                    nextMsg.chatting = true;
                    nextMsg.selectedContent = nextMsg.selectedContent <= session.replyCount - 1 ? nextMsg.selectedContent : session.replyCount - 1
                    nextMsg.multiContent = initMultiContent()
                    return nextMsg
                } else {
                    const newMsg = reactive({
                        role: "assistant",
                        selectedContent: 0,
                        multiContent: initMultiContent(),
                        chatting: true
                    })
                    this.currentSession.messages.splice(index + 1, 0, newMsg);
                    return newMsg
                }
            })()
            //多回复
            const responses = [];
            for (let i = 0; i < this.currentSession.replyCount; i++) {
                try {
                    responses.push(completions(data, session.model).then(response => {
                        if (response.status === 200) {
                            return this.handleStreamMsg(response, chattingMsg.multiContent[i])
                        } else {
                            chattingMsg.multiContent[i].content = `发生错误：\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
                            return null
                        }
                    }))
                } catch (error) {
                    chattingMsg.multiContent[i].content = `发生错误：\n\`\`\`json\n${JSON.stringify(error, null, 2)}\n\`\`\``;
                } finally {
                    delete chattingMsg.multiContent[i].chatting;
                }
            }
            //所有回复完成
            try {
                Promise.all(responses).then(() => {
                    delete chattingMsg.chatting;
                })
            } finally {
                delete chattingMsg.chatting;
            }


            //未评估
            if (!session.evaluate) {
                // this.evaluateSession(session)
            }
        },

        // 处理流消息
        handleStreamMsg(response, chatting) {
            return new Promise((resolve, reject) => {
                const { streamController } = useStream()
                return streamController(response, async (content) => {
                    chatting.content += content;
                    await delay(4);
                }, async () => {
                    await delay(800);
                    delete chatting.chatting;
                    resolve()
                })
            })
        },

        // 预设消息
        getSystemMsg() {
            return this.currentSession.system ? {
                role: "system",
                content: this.currentSession.system
            } : null;
        },
        async evaluateSession(session) {
            const evaluatePrompt = `# 角色
你是一个专业的对话评估专家，能够使用简洁准确的 emoji 表情和 3 到 10 个字对给定的对话进行评估，评估格式为：emoji evaluate。

## 技能
1. 仔细分析对话的内容、语气和意图。
2. 选择最能代表对话特点的 emoji 表情。
3. 用 3 到 10 个字简洁概括评估内容。

## 限制
1. 严格按照规定的格式进行评估。
2. 评估内容要客观、准确，符合对话实际。
3. 只进行对话评估，不做其他无关操作。`
            const data = {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: evaluatePrompt
                    },
                    ...session.messages
                ],
            }
            const response = await completions(data, "gpt-3.5-turbo")
            response.json().then(({ choices }) => {
                const res = choices[0].message.content
                session.evaluate = res
            })
        },

        // 清除上下文
        clearCtx() {
            if (!this.currentSession.clearedCtx) {
                this.currentSession.clearedCtx = [];
            } else {
                this.currentSession.messages.unshift(...this.currentSession.clearedCtx);
                delete this.currentSession.clearedCtx;
                return;
            }
            this.currentSession.clearedCtx.push(...this.currentSession.messages);
            this.currentSession.messages = [];
        },

        // 导入聊天记录
        importChat(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                this.sessions = data;
                this.currentSession = this.sessions[0];
            };
        },

        // 导出聊天记录
        exportChat() {
            const data = JSON.stringify(this.sessions);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'chat.json';
            link.click();
            URL.revokeObjectURL(url);
        },

        // 清除聊天记录
        clearChat() {
            this.sessions = [];
        }
    },
    persist: true,
});

export default useSessionsStore;