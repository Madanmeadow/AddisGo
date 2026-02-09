import { defineStore } from "pinia";
import { login, register } from "@/services/auth.service";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: localStorage.getItem("token"),
  }),

  getters: {
    isAuth: (state) => !!state.token,
  },

  actions: {
    async registerUser(payload) {
      const res = await register(payload);
      this.token = res.data.token;
      localStorage.setItem("token", this.token);
    },

    async loginUser(payload) {
      const res = await login(payload);
      this.token = res.data.token;
      localStorage.setItem("token", this.token);
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("token");
    },
  },
});
