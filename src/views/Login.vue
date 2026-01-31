<template>
  <div class="auth-container">
    <div class="card">
      <h2>Login</h2>

      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <p v-if="error" class="error">{{ error }}</p>

      <button @click="login">Login</button>
    </div>
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
      error: ""
    };
  },
  methods: {
    async login() {
      this.error = "";

      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });

        // ✅ SUCCESS PATH
        localStorage.setItem("token", res.data.token);
        this.$router.push("/dashboard");

      } catch (err) {
        this.error =
          err.response?.data?.message || "Login failed";
      }
    }
  }
};
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f6fa;
}
.card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 320px;
}
input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
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
  margin-bottom: 10px;
}
</style>
