import { onMounted, watch, onUnmounted } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from 'pinia';

// 定义主题枚举
export enum ThemeEnum {
    LIGHT = 'light',
    DARK = 'dark',
    AUTO = 'auto'
}

// 定义主题类型
export type Theme = ThemeEnum.LIGHT | ThemeEnum.DARK | ThemeEnum.AUTO;

const useTheme = (): void => {
    const configStore = useConfigStore();
    const { userConfig } = storeToRefs(configStore);

    // 媒体查询：是否处于暗黑模式
    const prefersDark: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    // 设置主题
    const setTheme = (): void => {
        const theme = userConfig.value.theme as Theme;
        const html = document.querySelector('html');

        if (!html) return;

        if (theme === ThemeEnum.AUTO) {
            html.className = prefersDark.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT;
        } else {
            html.className = theme;
        }
    };

    watch(
        () => userConfig.value.theme,
        () => {
            setTheme();
        },
        { immediate: true }
    );

    const handleMediaChange = (): void => {
        if (userConfig.value.theme === ThemeEnum.AUTO) {
            setTheme();
        }
    };

    onMounted(() => {
        prefersDark.addEventListener('change', handleMediaChange);
    });

    onUnmounted(() => {
        prefersDark.removeEventListener('change', handleMediaChange);
    });

    setTheme();
};

export default useTheme;