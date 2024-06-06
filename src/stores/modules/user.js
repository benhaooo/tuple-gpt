import { defineStore } from "pinia";
import { userLogin, queryUserAccount } from "@/apis"

const useUserStore = defineStore("user", {
  state: () => ({
    userInfo: {
      token: ""
    },
    account: {
      surplusQuota: 0
    }

  }),
  getters: {
    getSurplusQuota: (state) => {
      return state.account.surplusQuota
    },
    isLogin: (state) => {
      return state.userInfo.token !== null && state.userInfo.token !== ""
    }
  },
  actions: {
    // 登录
    async login(c) {
      const res = await userLogin(c)
      const { code, data } = await res.json()
      if (code === "0003") {
        return
      }
      this.userInfo.token = data
    },
    // 获取账户
    async fetchUserAccount() {
      if (!this.isLogin) {
        return
      }
      const res = await queryUserAccount()
      const { code, data } = await res.json()
      if (code === "0003") {
        return
      }
      this.account = data
    },
    getToken() {
      return this.userInfo.token
    },
    clearToken() {
      this.userInfo.token = ""
    }
  },
  persist: true,
});

export default useUserStore;