import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions } from "@/apis"
import { reactive } from "vue"
import useConfigStore from "@/stores/modules/config";
import useUserStore from "@/stores/modules/user";
import { storeToRefs } from "pinia";

const configStore = useConfigStore();
const userStore = useUserStore();
const { moduleConfig } = storeToRefs(configStore)

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
        // 修改会话配置
        updataSession(sessionConfig) {
            const curIndex = this.sessions.findIndex(session => session.id === this.currentSessionId);
            this.sessions[curIndex] = {
                ...this.sessions[curIndex],
                ...sessionConfig
            }
        },

        // 删除消息
        deleteMessage(msgId) {
            this.currentSession.messages = this.currentSession.messages.filter(msg => msg.id !== msgId);
        },
        // 重新交流
        async reChat(msgId) {
            userStore.account.surplusQuota--
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
        // 发送消息
        async sendMessage(text) {
            userStore.account.surplusQuota--
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
        // 处理流消息
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

        // 预设消息
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