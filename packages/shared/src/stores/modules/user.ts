import { defineStore } from "pinia";

// 定义用户信息类型
interface UserInfo {
  token: string;
}

// 定义账户信息类型
interface Account {
  surplusQuota: number;
}

// 定义用户状态类型
interface UserState {
  userInfo: UserInfo;
  account: Account;
}

// 定义登录参数类型
interface LoginCredentials {
  [key: string]: any;
}

const useUserStore = defineStore("user", {
  state: (): UserState => ({
    userInfo: {
      token: ""
    },
    account: {
      surplusQuota: 0
    }
  }),

  getters: {
    getSurplusQuota: (state): number => {
      return state.account.surplusQuota;
    },
    isLogin: (state): boolean => {
      return state.userInfo.token !== null && state.userInfo.token !== "";
    }
  },

  actions: {
    // 登录
    async login(credentials: LoginCredentials): Promise<void> {
      // TODO: 实现登录逻辑
      console.log('Login with credentials:', credentials);
    },

    // 获取账户
    async fetchUserAccount(): Promise<void> {
      // TODO: 实现获取账户信息逻辑
      if (!this.isLogin) {
        return;
      }
      console.log('Fetching user account...');
    },

    getToken(): string {
      return this.userInfo.token;
    },

    clearToken(): void {
      this.userInfo.token = "";
    }
  },


});

export default useUserStore;