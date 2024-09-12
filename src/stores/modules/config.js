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
        serverConfig: [{
            vendor: [],
            host: '',
            key: '',
        }],
        moduleConfig: {
            name: "New Chat",
            model: "gpt-4o",
            ctxLimit: 10,
            maxTokens: 4096,
            replyCount: 1,
            randomTemperature: true,
            temperature: 0.5,
            top_p: 1,
            presence_penalty: 0,
            frequency_penalty: 0,
        }

    }),
    getters: {
        getAvatar: (state) => state.userConfig.avatar || avaUrl,
        getModelConfig: (state) => {
            const modelMap = {};
            state.serverConfig.forEach(config => {
                config.vendor.forEach(vendor => {
                    modelMap[vendor[1]] = {
                        type: vendor[0],
                        host: config.host,
                        key: config.key,
                    }
                })
            })
            return modelMap;
        },
    },
    actions: {
        toggleTheme() {
            this.userConfig.theme = this.userConfig.theme === "auto" ? "dark" : "auto";
        },
        applyServerConfig(serverConfig) {
            this.serverConfig = serverConfig.filter(config => config.vendor.length && config.host && config.key);
        }
    },
    persist: true,
})

export default useConfigStore;