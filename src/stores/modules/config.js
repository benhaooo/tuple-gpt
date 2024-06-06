import { defineStore } from "pinia";
import avaUrl from "@/assets/imgs/ava.jpg";

const useConfigStore = defineStore("config", {
    state: () => ({
        userConfig: {
            avatar: "",
            name: "用户",
            script: "一条咸鱼",
            theme: "auto",

        },
        serverConfig: {
            apiHost: "",
            apiKey: ""
        },
        moduleConfig: {
            name: "New Chat",
            model: "gpt-3.5-turbo",
            ctxLimit: 10,
            maxTokens: 4096,
            temperature: 0.5,
            top_p: 1,
            presence_penalty: 0,
            frequency_penalty: 0,
        }

    }),
    getters: {
        getAvatar: (state) => state.userConfig.avatar || avaUrl,
    },
    actions: {
        toggleTheme() {
            this.userConfig.theme = this.userConfig.theme === "auto" ? "dark" : "auto";
        },
    },
    persist: true,
})

export default useConfigStore;