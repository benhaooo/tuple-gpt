import { createApp } from 'vue'
import App from './App.vue'
import pinia from './stores/index'
import router from './router/index'
import "@/assets/css/index.css"
import 'element-plus/theme-chalk/dark/css-vars.css'
import "animate.css/animate.min.css";

import ToastPlugin from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-bootstrap.css';

import * as ElementPlusIconsVue from '@element-plus/icons-vue';

const app = createApp(App)
app.use(pinia)
app.use(router)

app.use(ToastPlugin);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')