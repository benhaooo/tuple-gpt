import { createApp } from 'vue'
import App from './SidePanel.vue'
import { createPinia } from 'pinia'
import { piniaChormeStorage } from '@/plugin/pinia-chrome-storage'
import '@/styles/variables.css'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import '@/styles/global.css'

const pinia = createPinia()
pinia.use(piniaChormeStorage)
const app = createApp(App)
app.use(pinia)
app.mount('#app') 