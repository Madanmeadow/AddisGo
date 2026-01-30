<template>
  <div class="login-page">
    <div class="login-card">
      <h2>Login</h2>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
      />

      <p v-if="error" class="error">{{ error }}</p>

      <button :disabled="loading" @click="login">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
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
      error: "",
      loading: false
    };
  },
  methods: {
    async login() {
      this.error = "";
      this.loading = true;

      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });

        // ✅ SAVE TOKEN
        localStorage.setItem("token", res.data.token);

        // ✅ REDIRECT
        this.$router.push("/dashboard");
      } catch (err) {
        this.error =
          err.response?.data?.message || "Login failed";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
}

.login-card {
  background: white;
  padding: 2rem;
  width: 320px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
}

button {
  width: 100%;
  padding: 10px;
  background: #1e88e5;
  color: white;
  border: none;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
}

.error {
  color: red;
  margin-top: 8px;
}
</style>
