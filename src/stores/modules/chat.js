import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis";
import { reactive } from "vue";
import useConfigStore from "@/stores/modules/config";
import useUserStore from "@/stores/modules/user";
import { storeToRefs } from "pinia";

const configStore = useConfigStore();
const userStore = useUserStore();
const { moduleConfig } = storeToRefs(configStore);

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [],
        currentSessionId: "",
        askprompt: {},
    }),
    getters: {
        currentSession: (state) => state.sessions.find(session => session.id === state.currentSessionId),
    },
    actions: {
        // 新增会话
        addSession() {
            const session = {
                id: generateUniqueId(),
                messages: [],
                ...moduleConfig.value
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
                if(imgUrl) session.model = "gpt-4o";
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
                const combinedMessages = this.currentSession.messages.filter(msg => msg.role !== "assistant").map(msg => ({
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
            return new Promise(async (resolve, reject) => {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                new ReadableStream({
                    start(controller) {
                        async function push() {
                            const { done, value } = await reader.read();
                            if (done) {
                                controller.close();
                                await delay(800);
                                delete chatting.chatting;
                                resolve();
                                return;
                            }
                            controller.enqueue(value);
                            const chunk = decoder.decode(value);
                            buffer += chunk;
                            const lines = buffer.split('\n');
                            buffer = lines.pop();
                            for (const line of lines) {
                                if (line.trim().startsWith('data:')) {
                                    const jsonStr = line.trim().substring(5).trim();
                                    if (jsonStr !== '[DONE]') {
                                        const json = JSON.parse(jsonStr);
                                        if (json.choices && json.choices[0] && json.choices[0].delta) {
                                            const content = json.choices[0].delta.content || '';
                                            chatting.content += content;
                                            await delay(4);
                                        }
                                    }
                                }
                            }
                            push();
                        }
                        push();
                    },
                });
            });
        },

        // 预设消息
        getSystemMsg() {
            return this.currentSession.system ? {
                role: "system",
                content: this.currentSession.system
            } : null;
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