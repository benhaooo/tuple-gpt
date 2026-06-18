import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import '@tuple-gpt/theme/uno.css'
import { piniaChormeStorage } from '@/plugin/pinia-chrome-storage'

const pinia = createPinia()
pinia.use(piniaChormeStorage)
const app = createApp(App)
app.use(pinia)
app.mount('#app')
