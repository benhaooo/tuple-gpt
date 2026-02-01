import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),//hash模式
  routes: [
    {
      path: '',
      redirect: { name: 'message' }
    },
    {
      path: '/chat/message',
      name: 'message',
      component: () => import('@/views/pages/chat/index.vue'),
    },
    {
      path: '/chat/setting',
      name: 'setting',
      component: () => import('@/views/pages/setting/index.vue'),
    },
    {
      path: '/chat/tool',
      name: 'tool',
      component: () => import('@/views/pages/tool/index.vue'),
    },
  ],
})



export default router
