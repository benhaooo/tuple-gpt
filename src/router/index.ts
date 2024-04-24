import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '',
      redirect: { name: 'message' }
    },
    {
      path: '/chat/message',
      name: 'message',
      component: () => import('@/views/pages/Message.vue'),
    },
    {
      path: '/chat/prompt',
      name: 'prompt',
      component: () => import('@/views/pages/Prompt.vue'),
    },
    {
      path: '/chat/setting',
      name: 'setting',
      component: () => import('@/views/pages/Setting.vue'),
    },
    {
      path: '/chat/store',
      name: 'store',
      component: () => import('@/views/pages/Store.vue'),
    },
    {
      path: '/chat/file',
      name: 'file',
      component: () => import('@/views/pages/FileAnalysis.vue'),
    },
  ],
})



export default router
