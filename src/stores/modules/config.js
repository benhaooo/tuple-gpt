import { defineStore } from "pinia";
import avaUrl from "@/assets/imgs/xiaoxing.png";

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
            model: "0125-preview",
            ctxLimit: 10,
            maxTokens: 4096,
            replyCount: 5,
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