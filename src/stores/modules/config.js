import { defineStore } from "pinia";

const useConfigStore = defineStore("config", {
    state: () => ({
        userConfig: {
            avatar: "",
            name: "用户",
            script: "一条咸鱼",
            theme: "auto",

        },
        serverConfig: {

        },
        moduleConfig: {
            name: "闲聊",
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
        getAvatar: (state) => state.userConfig.avatar || "/src/assets/imgs/ava.jpg",
    },
    actions: {

    }
})

export default useConfigStore;