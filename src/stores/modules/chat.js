import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis"
import { reactive } from "vue"

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [],
        currentSessionId: "",
        askprompt: {},
    }),
    getters: {
        currentSession: (state) => {
            return state.sessions.find(
                (session) => session.id == state.currentSessionId
            );
        },
    },
    actions: {
        initSessions(obj) {
            this.sessions = obj._object.sessions
            this.currentSessionId = this.sessions.at(0).id
        },
        addSession(session) {
            this.sessions.unshift(session);
            this.currentSessionId = session.id;

        },
        deleteSession(index) {
            const curIndex = this.sessions.findIndex(session => session.id === this.currentSessionId);
            if (index == curIndex) {
                if (this.sessions.length === 1) {
                    this.sessions[index].messages = [];
                    return;
                }

                if (index == this.sessions.length - 1) {
                    this.currentSessionId = this.sessions[index - 1].id;
                } else {
                    this.currentSessionId = this.sessions[index + 1].id;
                }
            }

            this.sessions.splice(index, 1);
        },
        setCurrentSession(id) {
            this.currentSessionId = id;
        },

        updataSession(sessionConfig) {
            const curIndex = this.sessions.findIndex(session => session.id === this.currentSessionId);
            this.sessions[curIndex] = {
                ...this.sessions[curIndex],
                ...sessionConfig
            }
        },

        deleteMessage(msgId) {
            this.currentSession.messages = this.currentSession.messages.filter(msg => msg.id !== msgId);
        },
        async reChat(msgId) {

            const msgIndex = this.currentSession.messages.findIndex(msg => {
                return msg.id === msgId
            })
            const currentMsg = this.currentSession.messages[msgIndex]
            currentMsg.content = ''
            currentMsg.chatting = true

            const slicedMessages = this.currentSession.messages.slice(0, msgIndex)
            const systemMessage = this.getSytemMesg()
            const data = {
                model: this.currentSession.model,
                messages: [systemMessage, ...slicedMessages],
            }
            const response = await completions(data)
            this.handleStreamMsg(response, currentMsg)
        },
        async sendMessage(text) {
            this.currentSession.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
            });
            const systemMessage = this.getSytemMesg()
            const data = {
                model: this.currentSession.model,
                messages: [systemMessage, ...this.currentSession.messages],
            }
            const chattingMsg = reactive({
                id: generateUniqueId(),
                role: "assistant",
                content: "",
                chatting: true
            })
            this.currentSession.messages.push(chattingMsg);
            const response = await completions(data)
            this.handleStreamMsg(response, chattingMsg)
        },

        handleStreamMsg(response, chatting) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            new ReadableStream({
                start(controller) {
                    async function push() {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            await delay(1000)
                            delete chatting["chatting"]
                            return;
                        }
                        controller.enqueue(value);
                        const text = decoder.decode(value);
                        // 权限校验
                        if (text === "0003") {
                            delete chatting["chatting"]
                            controller.close();
                        }
                        for (let word of text) {
                            chatting.content += word;
                            await delay(4);
                        }
                        push();
                    }
                    push();
                },
            });
        },
        getSytemMesg() {
            return {
                id: generateUniqueId(),
                role: "system",
                content: this.currentSession.system || "你是一名智能AI助手"
            }
        },

        // 清楚上下文
        clearCtx() {
            if (!this.currentSession.clearedCtx) {
                this.currentSession.clearedCtx = [];
            } else {
                this.currentSession.messages.unshift(...this.currentSession.clearedCtx)
                delete this.currentSession.clearedCtx
                return
            }
            this.currentSession.clearedCtx.push(...this.currentSession.messages);
            this.currentSession.messages = [];
        },
    },
    persist: true,
});
export default useSessionsStore