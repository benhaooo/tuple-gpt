/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'selector',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // 主题色彩系统 - 语义化命名
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        // 表面色彩 - 背景和容器
        surface: {
          // 亮色模式
          light: {
            primary: '#ffffff',
            secondary: '#f8fafc',
            tertiary: '#f1f5f9',
            elevated: '#ffffff',
            overlay: 'rgba(0, 0, 0, 0.1)',
          },
          // 暗色模式 - 深黑色系
          dark: {
            primary: '#000000',      // 纯黑色主背景
            secondary: '#0a0a0a',    // 深黑色次要背景
            tertiary: '#1a1a1a',     // 深灰色第三级背景
            elevated: '#1a1a1a',     // 深灰色悬浮背景
            overlay: 'rgba(0, 0, 0, 0.8)',
          }
        },

        // 文本色彩
        text: {
          light: {
            primary: '#0f172a',
            secondary: '#475569',
            tertiary: '#64748b',
            disabled: '#94a3b8',
            inverse: '#ffffff',
          },
          dark: {
            primary: '#ffffff',      // 纯白色主文本，确保在黑色背景上清晰可读
            secondary: '#e5e5e5',    // 浅灰色次要文本
            tertiary: '#a3a3a3',     // 中灰色第三级文本
            disabled: '#525252',     // 深灰色禁用文本
            inverse: '#000000',      // 黑色反色文本
          }
        },

        // 边框色彩
        border: {
          light: {
            primary: '#e2e8f0',
            secondary: '#cbd5e1',
            focus: '#3b82f6',
            error: '#ef4444',
          },
          dark: {
            primary: '#2a2a2a',      // 深灰色主边框，在黑色背景上可见
            secondary: '#404040',    // 中灰色次要边框
            focus: '#60a5fa',        // 保持蓝色焦点边框
            error: '#f87171',       // 保持红色错误边框
          }
        },

        // 状态色彩
        semantic: {
          success: {
            light: '#10b981',
            dark: '#34d399',
          },
          warning: {
            light: '#f59e0b',
            dark: '#fbbf24',
          },
          error: {
            light: '#ef4444',
            dark: '#f87171',
          },
          info: {
            light: '#3b82f6',
            dark: '#60a5fa',
          }
        },

        // 交互色彩
        interactive: {
          light: {
            hover: '#f1f5f9',
            active: '#e2e8f0',
            selected: '#dbeafe',
            focus: 'rgba(59, 130, 246, 0.1)',
          },
          dark: {
            hover: '#1a1a1a',       // 深灰色悬停背景
            active: '#2a2a2a',      // 中灰色激活背景
            selected: '#1e40af',    // 保持蓝色选中背景
            focus: 'rgba(96, 165, 250, 0.2)',  // 稍微增强焦点透明度
          }
        },

        // 兼容旧版本的颜色（逐步迁移）
        'drag-over-border-color': '#3b82f6',
        'drag-over-bg-color': '#dbeafe',
      },

      // 字体系统
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },

      // 间距系统
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },

      // 圆角系统
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // 阴影系统
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      },

      // 动画系统
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

