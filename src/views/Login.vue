<template>
  <div>
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  data() {
    return {
      email: "",
      password: "",
    };
  },
  methods: {
    async login() {
      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password,
        });

        localStorage.setItem("token", res.data.token);
        alert("Login success 🔥");
      } catch (err) {
        alert("Login failed ❌");
      }
    },
  },
};
</script>
