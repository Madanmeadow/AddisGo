<template>
  <div class="page">
    <div class="card">
      <h1>Login</h1>

      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <p v-if="error" class="error">{{ error }}</p>

      <button @click="login">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </div>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  data() {
    return { email: "", password: "", loading: false, error: null };
  },
  methods: {
    async login() {
      this.error = null;
      this.loading = true;
      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });
        localStorage.setItem("token", res.data.token);
        this.$router.push("/");
      } catch {
        this.error = "Invalid credentials";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}
.card {
  background: white;
  padding: 30px;
  width: 350px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.1);
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
  cursor: pointer;
}
.error {
  color: red;
  margin-bottom: 10px;
}
</style>
