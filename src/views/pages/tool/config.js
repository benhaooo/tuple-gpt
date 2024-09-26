import { defineAsyncComponent } from 'vue';

export default [
  {
    name: '学习笔记',
    icon: 'icon-tool-a',
    component: defineAsyncComponent(() => import('./tools/Notes/index.vue')),

  },
  {
    name: '地理新解',
    icon: 'icon-tool-b',
    component: defineAsyncComponent(() => import('./tools/NewWord/index.vue')),

  },
];