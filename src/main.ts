import { createApp } from 'vue'
import App from './App.vue'
import pinia from './stores/index'
import router from './router/index'
import "@/assets/css/index.css"
import 'element-plus/theme-chalk/dark/css-vars.css'
import "animate.css/animate.min.css";

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
