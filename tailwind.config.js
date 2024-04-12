/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  // 手动切换夜间模式
  darkMode: 'selector',
  // 关闭默认样式
  corePlugins: {
    preflight: false,
  },
  theme: {
    // colors: {},
    extend: {
      colors: {
        'dark': {
          'base': '#181818',
          'blue-base': '#409EFF',
          'hard-dark': '#161618',
          'border': '#494949',
          'text': '#FFFFFF',
          'wrapper': '#1F1F1F',
          'input-wrapper': '#313131',
        },
        'light': {
          'base': '#F9F9F9',
          'blue-base': '#409EFF',
          'hard': '#FFFFFF',
          'border': '#E0E0E6',
          'text': '#000000',
          'wrapper': '#F5F5F5',
        },
        'font-hover': '#0D0D0D',
        'font-normal': '#9B9B9B',
      }
    },
  },
  plugins: [],
}

