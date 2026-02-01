/**
 * 主题样式类库
 * 提供统一的、语义化的样式类名
 */

/**
 * 表面/背景样式类
 */
export const surfaceClasses = {
  // 主要背景
  primary: 'bg-surface-light-primary dark:bg-surface-dark-primary',
  
  // 次要背景
  secondary: 'bg-surface-light-secondary dark:bg-surface-dark-secondary',
  
  // 第三级背景
  tertiary: 'bg-surface-light-tertiary dark:bg-surface-dark-tertiary',
  
  // 悬浮/卡片背景
  elevated: 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-soft dark:shadow-medium',
  
  // 覆盖层背景
  overlay: 'bg-surface-light-overlay dark:bg-surface-dark-overlay',
  
  // 透明背景
  transparent: 'bg-transparent',
  
  // 渐变背景
  gradient: {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
    secondary: 'bg-gradient-to-r from-primary-400 to-primary-500',
    subtle: 'bg-gradient-to-r from-surface-light-secondary to-surface-light-tertiary dark:from-surface-dark-secondary dark:to-surface-dark-tertiary',
  }
} as const

/**
 * 文本样式类
 */
export const textClasses = {
  // 文本颜色
  primary: 'text-text-light-primary dark:text-text-dark-primary',
  secondary: 'text-text-light-secondary dark:text-text-dark-secondary',
  tertiary: 'text-text-light-tertiary dark:text-text-dark-tertiary',
  disabled: 'text-text-light-disabled dark:text-text-dark-disabled',
  inverse: 'text-text-light-inverse dark:text-text-dark-inverse',
  
  // 语义颜色
  success: 'text-semantic-success-light dark:text-semantic-success-dark',
  warning: 'text-semantic-warning-light dark:text-semantic-warning-dark',
  error: 'text-semantic-error-light dark:text-semantic-error-dark',
  info: 'text-semantic-info-light dark:text-semantic-info-dark',
  
  // 字体大小和权重组合
  heading: {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-semibold tracking-tight',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-medium',
    h5: 'text-lg font-medium',
    h6: 'text-base font-medium',
  },
  
  body: {
    large: 'text-lg leading-relaxed',
    medium: 'text-base leading-normal',
    small: 'text-sm leading-normal',
    tiny: 'text-xs leading-tight',
  },
  
  // 特殊文本样式
  code: 'font-mono text-sm bg-surface-light-tertiary dark:bg-surface-dark-tertiary px-1 py-0.5 rounded',
  link: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline-offset-2 hover:underline',
} as const

/**
 * 边框样式类
 */
export const borderClasses = {
  // 基础边框
  primary: 'border border-border-light-primary dark:border-border-dark-primary',
  secondary: 'border border-border-light-secondary dark:border-border-dark-secondary',
  
  // 特殊状态边框
  focus: 'border-border-light-focus dark:border-border-dark-focus',
  error: 'border-border-light-error dark:border-border-dark-error',
  
  // 边框方向
  top: 'border-t border-border-light-primary dark:border-border-dark-primary',
  bottom: 'border-b border-border-light-primary dark:border-border-dark-primary',
  left: 'border-l border-border-light-primary dark:border-border-dark-primary',
  right: 'border-r border-border-light-primary dark:border-border-dark-primary',
  
  // 圆角组合
  rounded: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  }
} as const

/**
 * 交互样式类
 */
export const interactiveClasses = {
  // 悬停效果
  hover: 'hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover transition-colors duration-200',
  
  // 激活效果
  active: 'active:bg-interactive-light-active dark:active:bg-interactive-dark-active',
  
  // 选中效果
  selected: 'bg-interactive-light-selected dark:bg-interactive-dark-selected',
  
  // 焦点效果
  focus: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-light-primary dark:focus:ring-offset-surface-dark-primary',
  
  // 禁用效果
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  
  // 组合交互效果
  clickable: 'cursor-pointer hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover active:bg-interactive-light-active dark:active:bg-interactive-dark-active transition-colors duration-200',
} as const

/**
 * 按钮样式类
 */
export const buttonClasses = {
  // 基础按钮样式
  base: 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
  
  // 按钮尺寸
  size: {
    xs: 'px-2 py-1 text-xs rounded',
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-3 text-base rounded-lg',
    xl: 'px-8 py-4 text-lg rounded-lg',
  },
  
  // 按钮变体
  variant: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
    secondary: 'bg-surface-light-secondary dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary border border-border-light-primary dark:border-border-dark-primary',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500',
    ghost: 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover',
    danger: 'bg-semantic-error-light text-white hover:bg-red-700 focus:ring-red-500',
  }
} as const

/**
 * 输入框样式类
 */
export const inputClasses = {
  // 基础输入框
  base: 'block w-full transition-colors duration-200 focus:outline-none',
  
  // 输入框尺寸
  size: {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-4 py-3 text-base rounded-lg',
  },
  
  // 输入框状态
  state: {
    default: 'bg-surface-light-primary dark:bg-surface-dark-primary border border-border-light-primary dark:border-border-dark-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-tertiary dark:placeholder-text-dark-tertiary focus:border-border-light-focus dark:focus:border-border-dark-focus focus:ring-1 focus:ring-border-light-focus dark:focus:ring-border-dark-focus',
    error: 'bg-surface-light-primary dark:bg-surface-dark-primary border border-border-light-error dark:border-border-dark-error text-text-light-primary dark:text-text-dark-primary focus:border-border-light-error dark:focus:border-border-dark-error focus:ring-1 focus:ring-border-light-error dark:focus:ring-border-dark-error',
    disabled: 'bg-surface-light-tertiary dark:bg-surface-dark-tertiary border border-border-light-secondary dark:border-border-dark-secondary text-text-light-disabled dark:text-text-dark-disabled cursor-not-allowed',
  }
} as const

/**
 * 卡片样式类
 */
export const cardClasses = {
  // 基础卡片
  base: 'bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light-primary dark:border-border-dark-primary rounded-lg',
  
  // 卡片变体
  variant: {
    default: 'shadow-soft',
    elevated: 'shadow-medium',
    interactive: 'shadow-soft hover:shadow-medium transition-shadow duration-200 cursor-pointer',
  },
  
  // 卡片内边距
  padding: {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
} as const

/**
 * 导航样式类
 */
export const navigationClasses = {
  // 导航栏
  navbar: 'bg-surface-light-elevated dark:bg-surface-dark-elevated border-b border-border-light-primary dark:border-border-dark-primary',
  
  // 导航项
  navItem: {
    base: 'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
    active: 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
    inactive: 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover hover:text-text-light-primary dark:hover:text-text-dark-primary',
  },
  
  // 侧边栏
  sidebar: 'bg-surface-light-secondary dark:bg-surface-dark-secondary border-r border-border-light-primary dark:border-border-dark-primary',
} as const

/**
 * 工具样式类
 */
export const utilityClasses = {
  // 阴影
  shadow: {
    soft: 'shadow-soft',
    medium: 'shadow-medium',
    strong: 'shadow-strong',
    glow: 'shadow-glow',
  },
  
  // 动画
  animation: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
  },
  
  // 过渡
  transition: {
    all: 'transition-all duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
  }
} as const

/**
 * 组合样式类 - 常用组件的完整样式
 */
export const componentClasses = {
  // 主要按钮
  primaryButton: `${buttonClasses.base} ${buttonClasses.size.md} ${buttonClasses.variant.primary}`,
  
  // 次要按钮
  secondaryButton: `${buttonClasses.base} ${buttonClasses.size.md} ${buttonClasses.variant.secondary}`,
  
  // 输入框
  textInput: `${inputClasses.base} ${inputClasses.size.md} ${inputClasses.state.default}`,
  
  // 卡片
  defaultCard: `${cardClasses.base} ${cardClasses.variant.default} ${cardClasses.padding.md}`,
  
  // 页面容器
  pageContainer: `min-h-screen ${surfaceClasses.primary}`,
  
  // 内容容器
  contentContainer: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`,
} as const
