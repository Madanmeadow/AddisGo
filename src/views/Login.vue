<template>
  <div class="auth-box">
    <h2>Login</h2>

    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <p v-if="error" class="error">{{ error }}</p>

    <button @click="login">Login</button>

    <p>
      No account?
      <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<script>
import api from "../services/api";

export default {
  data() {
    return {
      email: "",
      password: "",
      error: "",
    };
  },
  methods: {
    async login() {
      this.error = "";
      try {
        const res = await api.post("/auth/login", {
          email: this.email,
          password: this.password,
        });

        localStorage.setItem("token", res.data.token);
        this.$router.push("/dashboard");
      } catch (err) {
        this.error =
          err.response?.data?.message || "Login failed";
      }
    },
  },
};
</script>

<style scoped>
.auth-box {
  max-width: 360px;
  margin: 100px auto;
  padding: 30px;
  background: white;
  border-radius: 8px;
}
input {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
}
button {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
}
.error {
  color: red;
}
</style>
