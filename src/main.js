import { createApp } from 'vue'
import App from './App.vue'
import pinia from './stores'
import router from './router'
import "@/assets/css/index.css"
import 'element-plus/theme-chalk/dark/css-vars.css'

import ToastPlugin from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-bootstrap.css';

const app = createApp(App)
app.use(pinia)
app.use(router)

app.use(ToastPlugin);

// 屏蔽错误信息
app.config.errorHandler = () => null;
// 屏蔽警告信息
app.config.warnHandler = () => null;

app.mount('#app')
