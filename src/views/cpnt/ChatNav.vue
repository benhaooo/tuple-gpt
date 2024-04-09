<template>
  <div class="chat-nav-container">
    <div class="user-ava" @click="loginModalShow = !loginModalShow">
      <img :src="configStore.getAvatar" alt="用户头像" />
    </div>
    <el-dialog v-model="loginModalShow">
      <h2>请输入访问码</h2>
      <el-input class=" my-4" v-model="code" placeholder="填写访问码" />
      <el-button type="primary" @click="handleLogin">提交</el-button>
    </el-dialog>
    <div class="menu-list center">
      <template v-for="(item, index) in menuItems" :key="index">
        <div class="menu center" :class="{ selected: isSelected(item.route) }">
          <i class="iconfont" :class="item.icon" @click="handleClick(item.route)"></i>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import useUserStore from "@/stores/modules/user"
import useConfigStore from "@/stores/modules/config"
import { useRouter, useRoute } from "vue-router"
const userStore = useUserStore()
const configStore = useConfigStore()


const router = useRouter()
const route = useRoute()

const menuItems = [
  { icon: "icon-xinxi", route: '/chat/message' },
  { icon: "icon-prompt", route: '/chat/prompt' },
  { icon: "icon-shezhi", route: '/chat/setting' },
  { icon: "icon-store", route: '/chat/store' },
  { icon: "icon-store", route: '/chat/file' },
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
}

</script>


<style lang="less" scoped>
.chat-nav-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .user-ava {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 1px solid #ccc;
    overflow: hidden;
    transform: rotate(30deg);
    margin-top: 20px;

    img {
      height: 90%;
      width: 90%;
      border-radius: 50%;
    }
  }


  .menu-list {
    flex-direction: column;
    width: 100%;
    flex: 1;

    .menu {
      width: 100%;
      position: relative;
      cursor: pointer;
      margin: 20px 0;

      .iconfont {
        font-size: 24px;
        color: #999;
      }

      &:hover {
        .iconfont {
          color: #93b5cf;
        }
      }

      &::before {
        content: "";
        position: absolute;
        width: 6px;
        height: 60%;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        transition: 0.3s;
        border-radius: 3px;
        background-color: #2983bb !important;
        opacity: 0;
      }
    }

    .selected {
      .iconfont {
        color: #2983bb !important;
      }

      &::before {
        opacity: 1;
      }
    }
  }
}
</style>