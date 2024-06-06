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
        deleteMessage(index) {
            this.currentSession.messages.splice(index, 1)
        },
        // 重新交流
        async reChat(index) {
            const currentMsg = this.currentSession.messages[index]
            currentMsg.content = ''
            currentMsg.chatting = true

            const slicedMessages = this.currentSession.messages.slice(0, index)
            const systemMessage = this.getSytemMesg()
            if (systemMessage) slicedMessages.unshift(systemMessage)
            const data = {
                model: this.currentSession.model,
                messages: slicedMessages.map((msg) => {
                    return {
                        role: msg.role,
                        content: msg.content,
                    };
                }),
                stream: true,
                max_tokens: this.currentSession.maxTokens,
                temperature: this.currentSession.temperature,
                top_p: this.currentSession.top_p,
                presence_penalty: this.currentSession.presence_penalty,
                frequency_penalty: this.currentSession.frequency_penalty,

            }
            const response = await completions(data,this.currentSession.model)
            return this.handleStreamMsg(response, currentMsg)
        },

        async senImgMessage(text, imgUrl) {
            this.currentSession.messages.push({
                role: "user",
                content: text,
                img: imgUrl,
            });
            const systemMessage = this.getSytemMesg()
            const combinedMessages = this.currentSession.messages.filter((msg) => msg.role !== "system")
            if (systemMessage) combinedMessages.unshift(systemMessage)
            const data = {
                model: this.currentSession.model,
                messages: combinedMessages.map((msg) => {
                    return {
                        role: msg.role,
                        content: [
                            {
                                type: "text",
                                text: msg.content,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: msg.img,
                                },
                            }

                        ],
                    };
                }),
                max_tokens: this.currentSession.maxTokens,
                temperature: this.currentSession.temperature,
                top_p: this.currentSession.top_p,
                presence_penalty: this.currentSession.presence_penalty,
                frequency_penalty: this.currentSession.frequency_penalty,
            }
            const chattingMsg = reactive({
                role: "assistant",
                content: "",
                chatting: true
            })
            this.currentSession.messages.push(chattingMsg);
            const response = await completions(data,this.currentSession.model)
            delete chattingMsg.chatting
        },
        // 发送消息
        async sendMessage(text) {
            // userStore.account.surplusQuota--
            this.currentSession.messages.push({
                role: "user",
                content: text,
            });
            const systemMessage = this.getSytemMesg()
            const combinedMessages = [...this.currentSession.messages]
            if (systemMessage) combinedMessages.unshift(systemMessage)
            const data = {
                model: this.currentSession.model,
                messages: combinedMessages.map((msg) => {
                    return {
                        role: msg.role,
                        content: msg.content,
                    };
                }),
                stream: true,
                max_tokens: this.currentSession.maxTokens,
                temperature: this.currentSession.temperature,
                top_p: this.currentSession.top_p,
                presence_penalty: this.currentSession.presence_penalty,
                frequency_penalty: this.currentSession.frequency_penalty,
            }
            const chattingMsg = reactive({
                role: "assistant",
                content: "",
                chatting: true
            })
            this.currentSession.messages.push(chattingMsg);
            const response = await completions(data,this.currentSession.model)
            return this.handleStreamMsg(response, chattingMsg)
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
                                await delay(800)
                                delete chatting["chatting"]
                                resolve()
                                return;
                            }
                            controller.enqueue(value);
                            const chunk = decoder.decode(value);
                            buffer += chunk; //缓冲区
                            const lines = buffer.split('\n');
                            buffer = lines.pop(); // 最后一个可能是不完整的
                            for (const line of lines) {
                                if (line.trim().startsWith('data:')) {
                                    const jsonStr = line.trim().substring(5).trim();
                                    if (jsonStr !== '[DONE]') {
                                        const json = JSON.parse(jsonStr);
                                        if (json.choices && json.choices[0] && json.choices[0].delta) {
                                            const content = json.choices[0].delta.content || '';
                                            chatting.content += content
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
            })

        },

        // 预设消息
        getSytemMesg() {
            return this.currentSession.system ? {
                role: "system",
                content: this.currentSession.system
            } : null
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

        importChat(e) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.readAsText(file)
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result)
                this.sessions = data
                this.currentSession = this.sessions[0]
            }
        },
        exportChat() {
            const data = JSON.stringify(this.sessions)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'chat.json'
            link.click()
            URL.revokeObjectURL(url)
        },
        clearChat() {
            this.sessions = []
        }
    },
    persist: true,
});
export default useSessionsStore