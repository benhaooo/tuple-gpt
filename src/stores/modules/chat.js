import { defineStore } from "pinia";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import { completions, retryCompletions } from "@/apis";
import { computed, reactive } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import useStream from '@/hooks/stream'
import { da } from "element-plus/es/locales.mjs";

const configStore = useConfigStore();
const { moduleConfig, getModelConfig } = storeToRefs(configStore);

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [{
            id: "02v16x9y34hhlzcywn2j",
            name: "默认会话",
            messages: [],
            type: "chat",
            ai: [],
            ctxLimit: 5,
            locked: false,
            role: "user",
            model: 'gpt-4o'
        }],
        currentSessionId: "02v16x9y34hhlzcywn2j",
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
        // 新增模拟会话
        addAutoSession() {
            const session = {
                name: "模拟对话",
                id: generateUniqueId(),
                messages: [],
                type: "auto",
                ai: Array.from({ length: 2 }),
            }
            this.sessions.unshift(session);
            this.currentSessionId = session.id;
        },
        // 模拟会话添加会话方
        autoPushSession(index1, index2, no) {
            const autoSession = this.sessions[index1];
            const session = this.sessions[index2];
            session.role = no === 1 ? "user" : "assistant";
            autoSession.ai[no] = session;
            this.deleteSession(index2)
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
            if (nextMsg && nextMsg.role === 'assistant') session.messages.splice(index + 1, 1);
            await this.sendMessageInternal(index, { text, imgUrl }, session.ai && session.ai[1], nextMsg);
        },
        // 获取上下文
        getHistoryMsgs(index, session) {
            const reversed = session.role === "assistant"
            const historyMessages = session.messages.slice(Math.max(0, index - session.ctxLimit), index);
            return historyMessages.map(msg => ({
                role: reversed ? (msg.role === "user" ? "assistant" : "user") : msg.role,
                content: msg.multiContent ? msg.multiContent[msg.selectedContent].content : msg.content,
            }));
        },

        // 发送消息
        async sendMessage(text, num) {
            const session = this.currentSession;
            text = this.formatMessage({ text })
            const index = session.messages.push({
                id: generateUniqueId(),
                role: "user",
                content: text,
            }) - 1;
            await this.sendMessageInternal(index, { text, num }, session.ai && session.ai[1]);
            if (session.type === "auto") this.autoChat(session, 1)
        },
        async autoChat(session, no) {
            const latestIndex = session.messages.length - 1;
            const latestMsg = session.messages[latestIndex];
            const text = latestMsg.content || latestMsg.multiContent[latestMsg.selectedContent].content;
            const qno = 1 - no
            await this.sendMessageInternal(latestIndex, { text }, session.ai[qno])
            if (session.messages.length > 10) return
            this.autoChat(session, qno)
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
        async sendMessageInternal(index, { text, imgUrl, num }, qSession = this.currentSession, nextMsg = null) {
            const session = this.currentSession;
            if (imgUrl) qSession.model = "gpt-4o";
            const systemMessage = this.getSystemMsg(qSession);
            const historyMessages = imgUrl ? [] : this.getHistoryMsgs(index, session)
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

            const data = {
                model: qSession.model,
                messages: combinedMessages,
                stream: true,
                max_tokens: qSession.maxTokens,
                temperature: qSession.temperature,
                top_p: qSession.top_p,
                presence_penalty: qSession.presence_penalty,
                frequency_penalty: qSession.frequency_penalty,
            };

            const generateDatas = (num, data) => {
                if (num === 0) {
                    const models = Object.keys(getModelConfig.value);
                    return models.map(model => ({ ...data, model }));
                } else {
                    const replyCount = num || nextMsg?.multiContent?.length || 1;
                    return Array(replyCount).fill(data);
                }
            };
            const datas = generateDatas(num, data)
            
            const replyCount = datas.length
            const chattingMsg = reactive({
                id: generateUniqueId(),
                role: qSession.role === "assistant" ? "user" : "assistant",
                selectedContent: 0,
                multiContent: Array.from({ length: replyCount }, () => ({ content: "", chatting: true, id: generateUniqueId() })),
                chatting: true
            })
            session.messages.splice(index + 1, 0, chattingMsg);
            //多回复
            const responses = [];
            for (let i = 0; i < replyCount; i++) {
                if (session.randomTemperature) datas[i].temperature = Number(((i + 1) / (replyCount + 1)).toFixed(2));
                chattingMsg.multiContent[i].model = datas[i].model
                responses.push(completions(datas[i]).then(response => {
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
            if (session.name === configStore.moduleConfig.name) {
                this.evaluateSession(session)
            }
        },

        // 处理流消息
        handleStreamMsg(response, chatting) {
            return new Promise((resolve, reject) => {
                const { streamController } = useStream()
                const controller = streamController(response, async (content) => {
                    chatting.content += content;
                    await delay(4);
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
            const response = await retryCompletions(data, "gpt-3.5-turbo")
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