import { ref, computed, onMounted, watch, onUnmounted } from "vue"
import useConfigStore from "@/stores/modules/config"
import { storeToRefs } from 'pinia'


const ThemeEnum = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
}
const useTheme = () => {

    const configStore = useConfigStore()
    const { userConfig } = storeToRefs(configStore)

    // 媒体查询：是否处于暗黑模式
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    // 设置主题
    const setTheme = () => {
        const theme = userConfig.value.theme
        const html = document.querySelector('html')
        if (theme === ThemeEnum.AUTO) {
            html.className = prefersDark.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT
        } else {
            html.className = theme
        }
    }

    watch(() => userConfig.value.theme, () => {
        setTheme()
    }, { immediate: true })

    const handleMediaChange = () => {
        if (userConfig.value.theme === ThemeEnum.AUTO) {
            setTheme()
        }
    }

    onMounted(() => {
        prefersDark.addEventListener('change', handleMediaChange)
    })

    onUnmounted(() => {
        prefersDark.removeEventListener('change', handleMediaChange)
    })

    setTheme()
}

export default useTheme