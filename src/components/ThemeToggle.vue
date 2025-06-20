<template>
  <div class="theme-toggle">
    <!-- 主题切换按钮 -->
    <button
      @click="handleToggle"
      :class="buttonClasses"
      :title="buttonTitle"
      class="group relative"
    >
      <!-- 图标容器 -->
      <div class="relative w-5 h-5 overflow-hidden">
        <!-- 太阳图标 (亮色模式) -->
        <Transition name="icon-fade">
          <SunIcon
            v-if="effectiveTheme === ThemeMode.LIGHT"
            class="absolute inset-0 w-5 h-5 text-yellow-500 group-hover:text-yellow-600 transition-colors duration-200"
          />
        </Transition>
        
        <!-- 月亮图标 (暗色模式) -->
        <Transition name="icon-fade">
          <MoonIcon
            v-if="effectiveTheme === ThemeMode.DARK"
            class="absolute inset-0 w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
          />
        </Transition>
        
        <!-- 自动图标 (自动模式) -->
        <Transition name="icon-fade">
          <ComputerDesktopIcon
            v-if="themeConfig.mode === ThemeMode.AUTO"
            class="absolute inset-0 w-5 h-5 text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300 transition-colors duration-200"
          />
        </Transition>
      </div>
      
      <!-- 模式指示器 -->
      <div
        v-if="showModeIndicator"
        class="absolute -top-1 -right-1 w-2 h-2 rounded-full transition-colors duration-200"
        :class="indicatorClasses"
      />
    </button>
    
    <!-- 主题选择下拉菜单 (可选) -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown && isDropdownOpen"
        class="absolute top-full right-0 mt-2 w-48 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light-primary dark:border-border-dark-primary rounded-lg shadow-medium z-50"
      >
        <div class="py-1">
          <button
            v-for="mode in themeOptions"
            :key="mode.value"
            @click="handleModeSelect(mode.value)"
            class="w-full px-4 py-2 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover transition-colors duration-200 flex items-center space-x-3"
            :class="{ 'bg-interactive-light-selected dark:bg-interactive-dark-selected': themeConfig.mode === mode.value }"
          >
            <component :is="mode.icon" class="w-4 h-4" />
            <span>{{ mode.label }}</span>
            <CheckIcon
              v-if="themeConfig.mode === mode.value"
              class="w-4 h-4 ml-auto text-primary-600 dark:text-primary-400"
            />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme, ThemeMode, type Theme } from '@/composables/use-theme'
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  CheckIcon 
} from '@heroicons/vue/24/outline'

interface Props {
  /** 按钮样式变体 */
  variant?: 'default' | 'minimal' | 'outlined'
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示模式指示器 */
  showModeIndicator?: boolean
  /** 是否显示下拉菜单 */
  showDropdown?: boolean
  /** 是否显示标签文本 */
  showLabel?: boolean
  /** 是否只在亮色和暗色之间切换（不包括自动模式） */
  lightDarkOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  showModeIndicator: false,
  showDropdown: false,
  showLabel: false,
  lightDarkOnly: false
})

const emit = defineEmits<{
  themeChanged: [theme: Theme]
}>()

// 主题管理
const { themeConfig, effectiveTheme, toggleTheme, setTheme, ThemeMode } = useTheme()

// 下拉菜单状态
const isDropdownOpen = ref(false)

// 主题选项
const themeOptions = [
  {
    value: ThemeMode.LIGHT,
    label: '亮色模式',
    icon: SunIcon
  },
  {
    value: ThemeMode.DARK,
    label: '暗色模式', 
    icon: MoonIcon
  },
  {
    value: ThemeMode.AUTO,
    label: '跟随系统',
    icon: ComputerDesktopIcon
  }
]

// 计算样式类
const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-light-primary dark:focus:ring-offset-surface-dark-primary'
  
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-md',
    md: 'w-10 h-10 rounded-lg',
    lg: 'w-12 h-12 rounded-xl'
  }
  
  const variantClasses = {
    default: 'bg-surface-light-secondary dark:bg-surface-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary border border-border-light-primary dark:border-border-dark-primary',
    minimal: 'hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover',
    outlined: 'border-2 border-border-light-primary dark:border-border-dark-primary hover:border-primary-500 dark:hover:border-primary-400 hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover'
  }
  
  return [
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant]
  ].join(' ')
})

// 指示器样式
const indicatorClasses = computed(() => {
  switch (themeConfig.value.mode) {
    case ThemeMode.LIGHT:
      return 'bg-yellow-400'
    case ThemeMode.DARK:
      return 'bg-blue-400'
    case ThemeMode.AUTO:
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
})

// 按钮标题
const buttonTitle = computed(() => {
  const modeLabels = {
    [ThemeMode.LIGHT]: '亮色模式',
    [ThemeMode.DARK]: '暗色模式',
    [ThemeMode.AUTO]: '自动模式'
  }
  
  const currentLabel = modeLabels[themeConfig.value.mode]
  return props.showDropdown ? `当前: ${currentLabel} (点击选择)` : `切换主题 (当前: ${currentLabel})`
})

// 处理切换
const handleToggle = () => {
  if (props.showDropdown) {
    isDropdownOpen.value = !isDropdownOpen.value
  } else {
    if (props.lightDarkOnly) {
      // 只在亮色和暗色之间切换
      const currentMode = themeConfig.value.mode
      if (currentMode === ThemeMode.LIGHT || currentMode === ThemeMode.AUTO) {
        setTheme(ThemeMode.DARK)
      } else {
        setTheme(ThemeMode.LIGHT)
      }
    } else {
      // 原有的三种模式轮换
      toggleTheme()
    }
    emit('themeChanged', themeConfig.value.mode)
  }
}

// 处理模式选择
const handleModeSelect = (mode: Theme) => {
  setTheme(mode)
  isDropdownOpen.value = false
  emit('themeChanged', mode)
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.theme-toggle')) {
    isDropdownOpen.value = false
  }
}

// 监听点击外部事件
if (props.showDropdown) {
  document.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.theme-toggle {
  @apply relative;
}

/* 图标切换动画 */
.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: all 0.3s ease;
}

.icon-fade-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.icon-fade-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}

/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
