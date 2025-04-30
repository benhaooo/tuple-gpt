import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions, retryCompletions } from "@/apis";
import { computed, reactive } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import useStream from '@/hooks/stream'
import { generateData, randomTemperature } from "@/models/data"
import { useToast } from 'vue-toast-notification';
import { useModel } from "@/models/data"

const configStore = useConfigStore();
const { modelConfig, getModelConfig } = storeToRefs(configStore);

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [{
            id: "default",
            name: "默认会话",
            messages: [],
            type: "chat",
            ai: [],
            ctxLimit: 5,
            locked: false,
            role: "user",
            model: 'gpt-4o'
        }],
        currentSessionId: "default",
        askprompt: {},
    }),
    getters: {
        currentSession: (state) => state.sessions.find(session => session.id === state.currentSessionId),
        filterSessions: (state) => {
            return (text) => {
                if (!text) return state.sessions
                return state.sessions.filter(session => {
                    return session.messages.some(msg => {
                        return (msg.content && msg.content.includes(text)) || (msg.multiContent > 0 && msg.multiContent.some(mc => {
                            return mc.content.includes(text)
                        }))
                    })
                })
            }
        }
    },
    actions: {
        // 创建会话
        createSession(custom) {
            const session = {
                id: generateUniqueId(),
                messages: [],
                ...modelConfig.value[0].config,
                ...custom,
            };
            return session;
        },
        // 新增会话
        addSession(custom) {
            const session = this.createSession(custom);
            this.sessions.unshift(session);
            this.currentSessionId = session.id;
        },
        // 新增模拟会话
        addAutoSession() {
            const session = this.createSession({
                name: "Mock Chat",
                type: "auto",
                ai: Array(2).fill(null),
            });
            this.sessions.unshift(session);
            this.currentSessionId = session.id;
        },

        // 模拟会话添加会话方
        autoPushSession(index1, index2, no) {
            const autoSession = this.sessions[index1];
            const session = index2 ? this.sessions[index2] : this.createSession();
            session.role = no === 1 ? "user" : "assistant";
            autoSession.ai[no] = session;
            index2 && this.deleteSession(index2)
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
            //删除操作推迟到下一个事件循环。给浏览器一个机会去处理当前的渲染帧，并触发 CSS 动画的开始状态
            setTimeout(() => {
                this.sessions.splice(index, 1);
            }, 0);
        },
        // 复制会话
        copySession(index) {
            const session = this.sessions[index];
            const newSession = JSON.parse(JSON.stringify(session));
            newSession.id = generateUniqueId();
            newSession.name = `${newSession.name} 副本`
            this.sessions.splice(index + 1, 0, newSession);
            this.currentSessionId = newSession.id;
        },

        setCurrentSession(id) {
            this.currentSessionId = id;
        },

        // 交换会话位置
        swapSession(index1, index2) {
            [this.sessions[index1], this.sessions[index2]] = [this.sessions[index2], this.sessions[index1]];
        },
        // 修改会话配置
        updateSession(newSession) {
            const session = this.sessions.find(session => session.id === newSession.id);
            Object.assign(session, newSession);
        },
        toggleLockSession(id) {
            const curIndex = this.sessions.findIndex(session => session.id === id);
            this.sessions[curIndex].locked = !this.sessions[curIndex].locked;
        },

        // 删除消息
        deleteMessage(id) {
            this.currentSession.messages = this.currentSession.messages.filter(msg => msg.id !== id);
        },
        createMessage(index, role) {
            this.currentSession.messages.splice(index, 0, {
                id: generateUniqueId(),
                role: role,
                multiContent: [{
                    content: "",
                    id: generateUniqueId(),
                }],
                selectedContent: 0,
            })
        },

        // 重新交流
        async reChat(id) {
            const session = this.currentSession
            const index = session.messages.findIndex(msg => msg.id === id);
            const { img: imgUrl, content: text } = session.messages[index];
            const nextMsg = session.messages[index + 1];
            if (nextMsg?.role === 'assistant') session.messages.splice(index + 1, 1);
            await this.sendMessageInternal(index, { text, imgUrl }, session.ai && session.ai[1], nextMsg);
        },
        // 获取上下文
        getHistoryMsgs(index, session, qSession) {
            const reversed = qSession?.role === "user"
            const historyMessages = session.messages.slice(Math.max(0, index - session.ctxLimit), index);

            return historyMessages.map(msg => ({
                role: reversed ? (msg.role === "assistant" ? "user" : "assistant") : msg.role,
                content: msg.multiContent ? msg.multiContent[msg.selectedContent].content : msg.content,
            }));
        },

        // 发送消息
        async sendMessage(text, num, formatter, empowerThink) {
            const session = this.currentSession;
            text = this.formatMessage({ text })
            const index = session.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
            }) - 1;
            this.sendMessageInternal(index, { text, num, formatter, empowerThink })
        },
        async sendNextMessage(text, num) {
            const session = this.currentSession;
            if (!session.ai[0] || !session.ai[1]) {
                useToast().warning('没有填充完全')
                return
            }
            text = this.formatMessage({ text })
            const lastMsg = session.messages[session.messages.length - 1]
            const roleMap = [
                'user',
                'assistant',
            ]
            const no = +(!lastMsg?.role === 'user')
            const index = session.messages.push({
                id: generateUniqueId(),
                role: roleMap[no],
                content: text,
            }) - 1;
            session.chatting = num || session.replyCount
            this.sendMessageInternal(index, { text, num: 1 }, session.ai[no]).then(() => {
                if (session.chatting) this.autoChat(session, no)
            })
        },
        // 模拟会话发送消息
        async autoChat(session, no) {
            const latestIndex = session.messages.length - 1;
            const latestMsg = session.messages[latestIndex];
            const text = latestMsg.content || latestMsg.multiContent[latestMsg.selectedContent].content;
            const nextNo = 1 - no
            this.sendMessageInternal(latestIndex, { text }, session.ai[nextNo]).then(() => {
                if (session.chatting) this.autoChat(session, nextNo)
            })
        },
        // 发送图片消息
        async sendImgMessage(text, imgUrl, num) {
            const index = this.currentSession.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
                img: imgUrl,
            }) - 1;
            await this.sendMessageInternal(index, { text, imgUrl, num });
        },

        formatMessage({ text }) {
            let template = this.currentSession.format || ""
            const placeholderRegEx = /\${(.*?)}/g;
            if (!template || !placeholderRegEx.test(template)) template += "${text}";
            // return template.replace(/\${(.*?)}/g, (match, p) => values[p])
            return template.replace(placeholderRegEx, text)
        },
        async sendMessageInternal(index, { text, imgUrl, num, formatter = '', empowerThink }, qSession = this.currentSession, nextMsg = null) {
            const session = this.currentSession;
            const systemMessage = this.getSystemMsg(qSession);
            const historyMessages = imgUrl ? [] : this.getHistoryMsgs(index, session, qSession)
            const indexMsg = {
                role: "user",
                content: imgUrl ? [
                    { type: "text", text: text },
                    { type: "image_url", image_url: { url: imgUrl } }
                ] : text
            }
            const combinedMessages = [indexMsg];
            if (historyMessages) combinedMessages.unshift(...historyMessages)
            if (systemMessage) combinedMessages.unshift(systemMessage);

            const getModels = (num, nextMsg) => {
                if (nextMsg?.multiContent?.length) {
                    return nextMsg.multiContent.map(mc => mc.model)
                }
                if (num === 0) {
                    return Object.keys(getModelConfig.value)
                }
                return Array.from({ length: num | 1 }, () => qSession.model)
            }
            const models = getModels(num, nextMsg)
            let datas = models.map(model => {
                return generateData(qSession, combinedMessages, model, formatter)
            })
            datas = randomTemperature(qSession, datas)
            const replyCount = datas.length

            const chattingMsg = reactive({
                id: generateUniqueId(),
                role: qSession.role || "assistant",
                selectedContent: 0,
                multiContent: datas.map(data => ({ content: formatter, reasoning_content: '', chatting: true, id: generateUniqueId(), model: data.model })),
                chatting: true
            })
            session.messages.splice(index + 1, 0, chattingMsg);
            //多回复
            const responses = [];
            for (let i = 0; i < replyCount; i++) {
                responses.push(
                    (async () => {
                        if (empowerThink) {
                            try {
                                const thinkResponse = await useModel(configStore.modelConfig[3].config.model).serviceFetch(datas[i])
                                if (thinkResponse.ok) {
                                    await (datas[i].stream ?
                                        this.handleStreamMsg(thinkResponse, chattingMsg.multiContent[i], { onlyThink: true }) :
                                        this.handleUnStreamMsg(thinkResponse, chattingMsg.multiContent[i]))
                                    datas[i].messages.push({
                                        role: "assistant",
                                        content: `<thinking>${chattingMsg.multiContent[i].reasoning_content}</thinking>`
                                    })
                                }
                            } catch (error) {

                            }
                        }

                        // 执行原来的 completions
                        return completions(datas[i]).then(response => {
                            if (response.ok) {
                                return datas[i].stream ?
                                    this.handleStreamMsg(response, chattingMsg.multiContent[i]) :
                                    this.handleUnStreamMsg(response, chattingMsg.multiContent[i])
                            } else {
                                return response.json().then(errorMsg => {
                                    throw new Error(JSON.stringify(errorMsg, null, 2));
                                });
                            }
                        }).catch(error => {
                            chattingMsg.multiContent[i].content = `发生错误了捏～：\n\`\`\`json\n${error.message}\n\`\`\``;
                        })
                    })()
                )
            }

            //所有回复完成
            await Promise.all(responses)
                .then(() => {
                    //未评估
                    this.evaluateSession(session)
                })
                .finally(() => {
                    // 统一处理清理操作
                    chattingMsg.multiContent.forEach(content => {
                        delete content.chatting;
                    });
                    delete chattingMsg.chatting;
                    session.chatting--
                });
        },
        handleUnStreamMsg(response, chatting) {
            return new Promise((resolve, reject) => {
                response.json().then(res => {
                    const content = res.choices[0].message.content
                    chatting.content = content;
                    delete chatting.chatting;
                    resolve()
                })
            })
        },
        // 处理流消息
        handleStreamMsg(response, chatting, { onlyThink } = {}) {
            return new Promise((resolve, reject) => {
                const { streamController } = useStream()
                const controller = streamController(response, async (content, reasoning_content, usage) => {
                    chatting.reasoning_content += reasoning_content
                    if (onlyThink && content) resolve(chatting.reasoning_content)
                    chatting.content += content;
                    if (usage) {
                        chatting.usage = usage
                    }
                }, async () => {
                    await delay(800);
                    resolve()
                })
                chatting.chatting = controller
            })
        },

        // 预设消息
        getSystemMsg(session) {
            return session.system ? {
                role: "system",
                content: session.system
            } : null;
        },
        // 评估会话
        async evaluateSession(session) {
            const evaluatePrompt = `使用一个emoji和四到六个字直接返回这句话的简要主题，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回“闲聊”`
            const data = {
                model: "gpt-3.5-turbo",
                messages: [
                    ...this.getHistoryMsgs(session.messages.length, session),
                    {
                        role: "system",
                        content: evaluatePrompt
                    },
                ],
            }

            const response = await useModel(configStore.modelConfig[1].config.model).serviceFetch(data)
            response.json().then(({ choices }) => {
                const res = choices[0].message.content
                session.name = res
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
            this.sessions = this.sessions.filter(session => session.locked)
            if (this.sessions.some(session => session.id == this.currentSessionId)) return;
            else this.currentSessionId = this.sessions[0].id
        }
    },
    persist: true,
});

export default useSessionsStore;