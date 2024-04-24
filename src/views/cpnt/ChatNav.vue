<template>
  <div class="bg-dark-nav flex md:flex-col justify-center items-center">
    <el-tooltip :content="userStore.isLogin ? '已登录' : '未登录'" placement="right" :show-after="500">
      <div
        class="relative flex justify-center items-center w-12 h-12 rounded-full border-2 border-light-border mt-5 cursor-pointer"
        @click="loginModalShow = !loginModalShow">
        <img class=" h-4/5 w-4/5 rounded-full" :src="configStore.getAvatar" alt="用户头像" />
        <div class="absolute bottom-0 right-0 w-2 h-2 rounded-full"
          :class="!!userStore.isLogin ? 'bg-green-500' : 'bg-gray-500'"></div>
      </div>
    </el-tooltip>

    <el-dialog v-model="loginModalShow">
      <h3 class=" font-extrabold text-blue-500">扫码关注公众号输入“1”获取访问码</h3>
      <img class="w-40 mb-4" src="@/assets/imgs/qr.jpg" alt="">
      <h2>请输入访问码:</h2>
      <el-input class=" my-4" v-model="code" placeholder="填写访问码" />
      <el-button type="primary" @click="handleLogin">提交</el-button>
    </el-dialog>
    <div class="center flex md:flex-col w-full flex-1">
      <template v-for="(item, index) in menuItems" :key="index">
        <div class="group flex max-md:flex-col-reverse items-center w-full cursor-pointer my-5">
          <span class="w-1/4 h-1 md:w-1 md:h-2/3 transition-opacity duration-300 rounded bg-dark-blue-base md:mr-2"
            :class="isSelected(item.route) ? 'opacity-100 ' : 'opacity-0'"></span>
          <i class="iconfont text-2xl group-hover:text-dark-blue-base"
            :class="[item.icon, isSelected(item.route) ? 'text-dark-blue-base' : '']"
            @click="handleClick(item.route)"></i>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import useUserStore from "@/stores/modules/user"
import useConfigStore from "@/stores/modules/config"
import { useRouter, useRoute } from "vue-router"
import { useToast } from 'vue-toast-notification';

const userStore = useUserStore()
const configStore = useConfigStore()


const router = useRouter()
const route = useRoute()

const menuItems = [
  { icon: "icon-xinxi", route: '/chat/message' },
  { icon: "icon-prompt", route: '/chat/prompt' },
  { icon: "icon-shezhi", route: '/chat/setting' },
  { icon: "icon-store", route: '/chat/store' },
  { icon: "icon-application", route: '/chat/file' },
];
const handleClick = (routePath) => {
  router.push(routePath)
}
const isSelected = computed(() => {
  return (routeName) => {
    return route.matched.some((record) => record.path === routeName);
  };
});


const loginModalShow = ref(false)
const code = ref(null)
const handleLogin = async () => {
  await userStore.login(code.value)
  loginModalShow.value = false
  useToast().success("登录成功")
}
userStore.fetchUserAccount()

</script>
