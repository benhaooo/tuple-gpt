import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis";
import { reactive } from "vue";
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
        addSession() {
            const session = {
                id: generateUniqueId(),
                messages: [],
                ...moduleConfig.value,
                chatting: () => {
                    messages.some(msg => {
                        return !!msg.chatting
                    })
                }
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
            const currentMsg = this.currentSession.messages[index];
            currentMsg.content = '';
            currentMsg.chatting = true;
            await this.sendMessageInternal(index, currentMsg.img ? { text: currentMsg.content, imgUrl: currentMsg.img } : { text: currentMsg.content });
        },

        // 发送图片消息
        async sendImgMessage(text, imgUrl, index = null) {
            await this.sendMessageInternal(index, { text, imgUrl });
        },

        // 发送消息
        async sendMessage(text, index = null) {
            await this.sendMessageInternal(index, { text });
        },

        async sendMessageInternal(index, { text, imgUrl }) {
            try {
                const session = this.currentSession;
                if (imgUrl) session.model = "gpt-4o";
                if (index === null) {
                    this.currentSession.messages.push({
                        role: "user",
                        content: text,
                        img: imgUrl,
                    });
                } else {
                    this.currentSession.messages[index].content = text;
                    if (imgUrl) this.currentSession.messages[index].img = imgUrl;
                }

                const systemMessage = this.getSystemMsg();
                const combinedMessages = this.currentSession.messages.map(msg => ({
                    role: msg.role,
                    content: msg.img ? [
                        { type: "text", text: msg.content },
                        { type: "image_url", image_url: { url: msg.img } }
                    ] : msg.content,
                }));
                if (systemMessage) combinedMessages.unshift(systemMessage);

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

                const chattingMsg = index === null ? reactive({
                    role: "assistant",
                    content: "",
                    chatting: true
                }) : this.currentSession.messages[index];

                if (index === null) this.currentSession.messages.push(chattingMsg);

                const response = await completions(data, session.model);
                if (response.status === 200) {
                    await this.handleStreamMsg(response, chattingMsg);
                } else {
                    const res = await response.json();
                    chattingMsg.content = `发生错误：\n\`\`\`json\n${JSON.stringify(res, null, 2)}\n\`\`\``;
                    delete chattingMsg.chatting;
                }
                //未评估
                if (!session.evaluate) {
                    this.evaluateSession(session)
                }

            } catch (error) {
                console.error("Error in sendMessageInternal:", error);
                if (index !== null) {
                    this.currentSession.messages[index].content = `发生错误：\n\`\`\`json\n${error.message}\n\`\`\``;
                    delete this.currentSession.messages[index].chatting;
                }
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
你是一个专业的对话评估专家，能够使用简洁准确的 emoji 表情和 3 到 10 个字对给定的对话进行评估，评估格式为：[emoji][evaluate]。

## 技能
1. 仔细分析对话的内容、语气和意图。
2. 选择最能代表对话特点的 emoji 表情。
3. 用 3 到 10 个字简洁概括评估内容。

## 限制
1. 严格按照规定的格式进行评估。
2. 评估内容要客观、准确，符合对话实际。
3. 只进行对话评估，不做其他无关操作。`
            const data = {
                messages: [
                    {
                        role: "system",
                        content: evaluatePrompt
                    },
                    ...session.messages
                ],
            }
            const response = await completions(data, "0125-preview")
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