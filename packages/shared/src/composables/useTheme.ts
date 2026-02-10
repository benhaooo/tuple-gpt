import { watch, onUnmounted } from 'vue'
import { useSettingsStore } from '@shared/stores/settingsStore'

export const ThemeName = {
  light: 'light',
  dark: 'dark',
  system: 'system',
} as const

export type ThemeName = (typeof ThemeName)[keyof typeof ThemeName]

export function useTheme(getTargetElement = () => document.documentElement) {
  const settingsStore = useSettingsStore()
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  // 应用主题到 DOM
  const applyTheme = (theme: ThemeName) => {
    const element = getTargetElement()
    if (!element) return

    const isDark = theme === ThemeName.system
      ? mediaQuery.matches
      : theme === ThemeName.dark

    element.classList.toggle('dark', isDark)
  }

  // 系统主题变化处理
  const handleSystemThemeChange = () => {
    applyTheme(ThemeName.system)
  }

  // 监听主题变化
  watch(
    () => settingsStore.settings.theme,
    (theme) => {
      if (!theme) return

      applyTheme(theme)

      if (theme === ThemeName.system) {
        mediaQuery.addEventListener('change', handleSystemThemeChange)
      } else {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  })
} 