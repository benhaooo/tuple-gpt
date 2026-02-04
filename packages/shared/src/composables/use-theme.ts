import { computed, onMounted, onUnmounted, watch } from 'vue'
import useConfigStore from '@shared/stores/modules/config'
import { storeToRefs } from 'pinia'

/**
 * 主题枚举
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark', 
  AUTO = 'auto'
}

/**
 * 主题类型
 */
export type Theme = ThemeMode.LIGHT | ThemeMode.DARK | ThemeMode.AUTO

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  mode: Theme
  systemPreference: ThemeMode.LIGHT | ThemeMode.DARK
  effectiveTheme: ThemeMode.LIGHT | ThemeMode.DARK
}

/**
 * 主题颜色变量映射
 */
export const themeVariables = {
  [ThemeMode.LIGHT]: {
    // 表面色彩
    '--surface-primary': '#ffffff',
    '--surface-secondary': '#f8fafc', 
    '--surface-tertiary': '#f1f5f9',
    '--surface-elevated': '#ffffff',
    '--surface-overlay': 'rgba(0, 0, 0, 0.1)',
    
    // 文本色彩
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-tertiary': '#64748b',
    '--text-disabled': '#94a3b8',
    '--text-inverse': '#ffffff',
    
    // 边框色彩
    '--border-primary': '#e2e8f0',
    '--border-secondary': '#cbd5e1',
    '--border-focus': '#3b82f6',
    '--border-error': '#ef4444',
    
    // 交互色彩
    '--interactive-hover': '#f1f5f9',
    '--interactive-active': '#e2e8f0',
    '--interactive-selected': '#dbeafe',
    '--interactive-focus': 'rgba(59, 130, 246, 0.1)',
  },
  
  [ThemeMode.DARK]: {
    // 表面色彩 - 深黑色系
    '--surface-primary': '#000000',      // 纯黑色主背景
    '--surface-secondary': '#0a0a0a',    // 深黑色次要背景
    '--surface-tertiary': '#1a1a1a',     // 深灰色第三级背景
    '--surface-elevated': '#1a1a1a',     // 深灰色悬浮背景
    '--surface-overlay': 'rgba(0, 0, 0, 0.8)',

    // 文本色彩 - 高对比度
    '--text-primary': '#ffffff',         // 纯白色主文本
    '--text-secondary': '#e5e5e5',       // 浅灰色次要文本
    '--text-tertiary': '#a3a3a3',        // 中灰色第三级文本
    '--text-disabled': '#525252',        // 深灰色禁用文本
    '--text-inverse': '#000000',         // 黑色反色文本

    // 边框色彩 - 适配黑色背景
    '--border-primary': '#2a2a2a',       // 深灰色主边框
    '--border-secondary': '#404040',     // 中灰色次要边框
    '--border-focus': '#60a5fa',         // 蓝色焦点边框
    '--border-error': '#f87171',         // 红色错误边框

    // 交互色彩 - 黑色系适配
    '--interactive-hover': '#1a1a1a',    // 深灰色悬停背景
    '--interactive-active': '#2a2a2a',   // 中灰色激活背景
    '--interactive-selected': '#1e40af', // 蓝色选中背景
    '--interactive-focus': 'rgba(96, 165, 250, 0.2)', // 增强焦点透明度
  }
} as const

/**
 * 主题管理 Composable
 */
export function useTheme() {
  const configStore = useConfigStore()
  const { userConfig } = storeToRefs(configStore)
  
  // 系统主题偏好检测
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  /**
   * 获取系统主题偏好
   */
  const getSystemPreference = (): ThemeMode.LIGHT | ThemeMode.DARK => {
    return mediaQuery.matches ? ThemeMode.DARK : ThemeMode.LIGHT
  }
  
  /**
   * 计算有效主题
   */
  const effectiveTheme = computed((): ThemeMode.LIGHT | ThemeMode.DARK => {
    const currentMode = userConfig.value.theme as Theme
    if (currentMode === ThemeMode.AUTO) {
      return getSystemPreference()
    }
    return currentMode as ThemeMode.LIGHT | ThemeMode.DARK
  })
  
  /**
   * 主题配置对象
   */
  const themeConfig = computed((): ThemeConfig => ({
    mode: userConfig.value.theme as Theme,
    systemPreference: getSystemPreference(),
    effectiveTheme: effectiveTheme.value
  }))
  
  /**
   * 应用CSS变量到根元素
   */
  const applyCSSVariables = (theme: ThemeMode.LIGHT | ThemeMode.DARK) => {
    const root = document.documentElement
    const variables = themeVariables[theme]
    
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }
  
  /**
   * 应用主题到DOM
   */
  const applyTheme = (theme: ThemeMode.LIGHT | ThemeMode.DARK) => {
    const html = document.documentElement
    
    // 移除所有主题类
    html.classList.remove(ThemeMode.LIGHT, ThemeMode.DARK)
    
    // 添加当前主题类
    html.classList.add(theme)
    
    // 应用CSS变量
    applyCSSVariables(theme)
    
    // 设置data属性用于CSS选择器
    html.setAttribute('data-theme', theme)
  }
  
  /**
   * 切换主题（基于当前实际显示的主题进行切换）
   */
  const toggleTheme = () => {
    // 基于当前实际显示的主题来决定切换方向
    if (effectiveTheme.value === ThemeMode.LIGHT) {
      configStore.setTheme(ThemeMode.DARK)
    } else {
      configStore.setTheme(ThemeMode.LIGHT)
    }
  }
  
  /**
   * 设置特定主题
   */
  const setTheme = (theme: Theme) => {
    configStore.setTheme(theme)
  }
  
  /**
   * 系统主题变化处理
   */
  const handleSystemThemeChange = () => {
    if (userConfig.value.theme === ThemeMode.AUTO) {
      applyTheme(effectiveTheme.value)
    }
  }
  
  // 监听主题配置变化
  watch(
    () => effectiveTheme.value,
    (newTheme) => {
      applyTheme(newTheme)
    },
    { immediate: true }
  )
  
  // 生命周期管理
  onMounted(() => {
    // 初始化主题
    applyTheme(effectiveTheme.value)
    
    // 监听系统主题变化
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  })
  
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  })
  
  return {
    // 状态
    themeConfig,
    effectiveTheme,
    
    // 方法
    toggleTheme,
    setTheme,
    
    // 常量
    ThemeMode,
  }
}

/**
 * 主题工具函数
 */
export const themeUtils = {
  /**
   * 获取主题特定的类名
   */
  getThemeClass: (lightClass: string, darkClass: string, theme?: ThemeMode.LIGHT | ThemeMode.DARK) => {
    if (theme) {
      return theme === ThemeMode.LIGHT ? lightClass : darkClass
    }
    return `${lightClass} dark:${darkClass}`
  },
  
  /**
   * 获取主题特定的值
   */
  getThemeValue: <T>(lightValue: T, darkValue: T, theme: ThemeMode.LIGHT | ThemeMode.DARK): T => {
    return theme === ThemeMode.LIGHT ? lightValue : darkValue
  },
  
  /**
   * 检查是否为暗色主题
   */
  isDark: (theme: ThemeMode.LIGHT | ThemeMode.DARK): boolean => {
    return theme === ThemeMode.DARK
  },
  
  /**
   * 检查是否为亮色主题
   */
  isLight: (theme: ThemeMode.LIGHT | ThemeMode.DARK): boolean => {
    return theme === ThemeMode.LIGHT
  }
}
