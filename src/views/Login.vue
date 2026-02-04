<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>Login</h2>

      <form @submit.prevent="login">
        <input
          type="email"
          placeholder="Email"
          v-model="email"
          required
        />

        <input
          type="password"
          placeholder="Password"
          v-model="password"
          required
        />

        <button type="submit">Login</button>
      </form>

      <p class="link">
        No account?
        <router-link to="/register">Register</router-link>
      </p>
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
      password: ""
    };
  },
  methods: {
    async login() {
      try {
        const res = await api.post("/auth/login", {
          email: this.email,
          password: this.password
        });

        localStorage.setItem("token", res.data.token);
        this.$router.push("/dashboard");
      } catch (err) {
        alert("Login failed");
        console.error(err);
      }
    }
  }
};
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 60px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-top: 60px;
}

.auth-card {
  background: #ffffff;
  padding: 24px;
  width: 320px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.auth-card h2 {
  text-align: center;
  margin-bottom: 16px;
}

.auth-card input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.auth-card button {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.auth-card button:hover {
  background: #1d4ed8;
}

.link {
  margin-top: 12px;
  text-align: center;
}
</style>
