import { defineStore } from "pinia";
import { userLogin } from "@/apis"

const useUserStore = defineStore("user", {
  state: () => ({
    userInfo: {
      token: ""
    }
  }),
  actions: {
    async login(c) {
      const res = await userLogin(c)
      const { code, data } = await res.json()
      if (code === "0003") {
        return
      }
      this.userInfo.token = data
      localStorage.setItem("token", data)
    },
    getToken() {
      return this.userInfo.token||localStorage.getItem("token")
    }
  },
}, {
  persist: true
});

export default useUserStore;