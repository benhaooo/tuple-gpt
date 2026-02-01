<template>
  <div class="flex md:flex-col justify-center items-center">
    <div class="avatar-wrapper group relative flex justify-center items-end w-20 h-20 overflow-hidden md:mt-5">
      <div class=" absolute bottom-0  border-2 w-16 h-16 border-border-light-primary dark:border-border-dark-primary rounded-full z-10 translate-y-1"></div>
      <img class=" w-12 rounded-full cursor-pointer duration-300 group-hover:scale-150 z-20"
        :src="configStore.getAvatar" alt="用户头像" />
      <div class=" absolute bottom-0 border-b-4  w-16 h-16 border-border-light-primary dark:border-border-dark-primary rounded-full z-30 translate-y-1"></div>
    </div>

    <div class="center flex md:flex-col w-full flex-1">
      <template v-for="(item, index) in menuItems" :key="index">
        <div @click="handleClick(item.route)"
          class="group flex max-md:flex-col-reverse items-center w-full cursor-pointer md:my-5">
          <span class="w-1/4 h-1 md:w-1 md:h-2/3 transition-opacity duration-300 rounded bg-primary-500 md:mr-2"
            :class="isSelected(item.route) ? 'opacity-100 ' : 'opacity-0'"></span>
          <i class="iconfont text-2xl group-hover:text-primary-500 text-text-light-secondary dark:text-text-dark-secondary transition-colors duration-200"
            :class="[item.icon, isSelected(item.route) ? 'text-primary-500' : '']"></i>
        </div>
      </template>
    </div>

    <!-- 主题切换按钮 -->
    <div class="flex justify-center md:mb-5">
      <ThemeToggle variant="minimal" size="md" :light-dark-only="true" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from "vue"
import useConfigStore from "@/stores/modules/config"
import { useRouter, useRoute } from "vue-router"
import { useTheme } from "@/composables/use-theme"
import ThemeToggle from "@/components/ThemeToggle.vue"

const { } = useTheme()

const configStore = useConfigStore()
const router = useRouter()
const route = useRoute()

const menuItems = [
  { icon: "icon-xinxi", route: '/chat/message' },
  { icon: "icon-tool", route: '/chat/tool' },
  { icon: "icon-shezhi", route: '/chat/setting' },
];
const handleClick = (routePath) => {
  router.push(routePath)
}
const isSelected = computed(() => {
  return (routeName) => {
    return route.matched.some((record) => record.path === routeName);
  };
});



</script>
