import { defineStore } from "pinia";
import avaUrl from "@/assets/imgs/xiaoxing.png";
import type { Theme } from '@/composables/use-theme';

interface UserConfig {
  avatar: string;
  name: string;
  script: string;
  theme: Theme;
}

const useConfigStore = defineStore("config", {
  state: () => ({
    userConfig: {
      avatar: "",
      name: "用户",
      script: "一条咸鱼",
      theme: "auto",
    } as UserConfig,
  
  }),
  
  getters: {
    getAvatar: (state): string => state.userConfig.avatar || avaUrl
  },
  
  actions: {
    /**
     * 设置主题
     */
    setTheme(theme: Theme): void {
      this.userConfig.theme = theme;
    },

    /**
     * 切换主题（基于当前实际显示的主题进行切换）
     */
    toggleTheme(): void {
      const currentTheme = this.userConfig.theme;

      // 计算当前实际显示的主题
      let effectiveTheme: "light" | "dark";
      if (currentTheme === "auto") {
        // 检测系统偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? "dark" : "light";
      } else {
        effectiveTheme = currentTheme as "light" | "dark";
      }

      // 基于实际显示的主题进行切换
      if (effectiveTheme === "light") {
        this.userConfig.theme = "dark";
      } else {
        this.userConfig.theme = "light";
      }
    },
  },
  

});

export default useConfigStore;