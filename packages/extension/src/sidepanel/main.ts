import { createApp } from 'vue'
import App from './SidePanel.vue'
import { createPinia } from 'pinia'
import '@/styles/variables.css'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import '@/styles/global.css'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.mount('#app') 