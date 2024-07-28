import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions, retryCompletions } from "@/apis";
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

        // 交换会话位置
        swapSession(index1, index2) {
            // console.log("🚀 ~ swapSession ~ index2:", index2)
            // console.log("🚀 ~ swapSession ~ index1:", index1)
            [this.sessions[index1], this.sessions[index2]] = [this.sessions[index2], this.sessions[index1]];
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
        deleteMessage(id) {
            this.currentSession.messages = this.currentSession.messages.filter(msg => msg.id !== id);
        },

        // 重新交流
        async reChat(id) {
            const index = this.currentSession.messages.findIndex(msg => msg.id === id);
            const { img: imgUrl, content: text } = this.currentSession.messages[index];
            const nextMsg = this.currentSession.messages[index + 1];
            await this.sendMessageInternal(index, { text, imgUrl }, nextMsg);
        },
        // 获取上下文
        getHistoryMsgs(index, pSession) {
            const session = pSession || this.currentSession;
            const historyMessages = session.messages.slice(0, index);
            return historyMessages.map(msg => ({
                role: msg.role,
                content: msg.multiContent ? msg.multiContent[msg.selectedContent].content : msg.content,
            }));
        },

        // 发送消息
        async sendMessage(text, num) {
            const index = this.currentSession.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
            });
            await this.sendMessageInternal(index, { text, num });
        },
        // 发送图片消息
        async sendImgMessage(text, imgUrl, num) {
            const index = this.currentSession.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
                img: imgUrl,
            });
            await this.sendMessageInternal(index, { text, imgUrl, num });
        },


        async sendMessageInternal(index, { text, imgUrl, num }, nextMsg = null) {
            const replyCount = num || (nextMsg && nextMsg.multiContent.length) || this.currentSession.replyCount;
            const session = this.currentSession;
            if (!session.model) session.model = "gpt-3.5-turbo";
            if (imgUrl) session.model = "gpt-4o";

            const systemMessage = this.getSystemMsg();
            const historyMessages = imgUrl ? [] : this.getHistoryMsgs(index)
            const indexMsg = {
                role: "user",
                content: imgUrl ? [
                    { type: "text", text: text },
                    { type: "image_url", image_url: { url: imgUrl } }
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
                if (nextMsg && nextMsg.role === "assistant") {
                    nextMsg.chatting = true;
                    nextMsg.multiContent.forEach(content => {
                        content.chatting = true;
                        content.content = ""
                    });
                    return nextMsg
                } else {
                    const newMsg = reactive({
                        id: generateUniqueId(),
                        role: "assistant",
                        selectedContent: 0,
                        multiContent: Array.from({ length: replyCount }, () => ({ content: "", chatting: true, id: generateUniqueId() })),
                        chatting: true
                    })
                    this.currentSession.messages.splice(index + 1, 0, newMsg);
                    return newMsg
                }
            })()
            //多回复
            const responses = [];
            for (let i = 0; i < replyCount; i++) {
                data.temperature = Number(((i + 1) / (replyCount + 1)).toFixed(2));
                responses.push(completions(data, session.model).then(response => {
                    if (response.ok) {
                        return this.handleStreamMsg(response, chattingMsg.multiContent[i])
                    } else {
                        return response.json().then(errorMsg => {
                            throw new Error(JSON.stringify(errorMsg, null, 2));
                        });
                    }
                }).catch(error => {
                    chattingMsg.multiContent[i].content = `发生错误了捏～：\n\`\`\`json\n${error.message}\n\`\`\``;
                }))
            }
            //所有回复完成
            await Promise.all(responses).finally(() => {
                // 统一处理清理操作
                chattingMsg.multiContent.forEach(content => {
                    delete content.chatting;
                });
                delete chattingMsg.chatting;
            });

            //未评估
            if (!session.evaluate) {
                this.evaluateSession(session)
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
            const evaluatePrompt = `使用一个emoji和四到六个字直接返回这句话的简要主题，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回“闲聊”`
            const data = {
                model: "gpt-3.5-turbo",
                messages: [
                    ...this.getHistoryMsgs(session.messages.length, session),
                    {
                        role: "user",
                        content: evaluatePrompt
                    },
                ],
            }
            const response = await retryCompletions(data, "gpt-3.5-turbo")
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