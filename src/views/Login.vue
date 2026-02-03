<template>
  <div class="page">
    <h1>Login</h1>

    <input
      type="email"
      v-model="email"
      placeholder="Email"
    />

    <input
      type="password"
      v-model="password"
      placeholder="Password"
    />

    <button @click="login">Login</button>

    <p v-if="error" style="color:red">{{ error }}</p>

    <p>
      No account?
      <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  name: "Login",
  data() {
    return {
      email: "",
      password: "",
      error: "",
    };
  },
  methods: {
    async login() {
      try {
        const res = await api.post("/auth/login", {
          email: this.email,
          password: this.password,
        });

        localStorage.setItem("token", res.data.token);
        this.$router.push("/dashboard");
      } catch (e) {
        this.error = "Login failed";
      }
    },
  },
};
</script>

<style scoped>
.page {
  max-width: 400px;
  margin: 100px auto;
  text-align: center;
}
input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
}
button {
  padding: 8px 16px;
}
</style>
