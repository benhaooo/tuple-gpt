import { defineStore } from "pinia";

const useSessionsStore = defineStore('sessions', {
    state: () => ({
        sessions: [],
        currentSessionId: "",
        chattingMap: {},
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
            this.sessions.push(session);
            this.currentSessionId = session.id;
            console.log(this.sessions)

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
        addMessageToSession(index, message) {
            // this.sessions[index].messages.push(message);
        },
    },
});
export default useSessionsStore