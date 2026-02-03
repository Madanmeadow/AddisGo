<template>
  <div class="auth-page">
    <div class="auth-card">
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

      <button @click="login">Login</button>

      <p>
        No account?
        <router-link to="/register">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import api from "../services/api";
import { useRouter } from "vue-router";

export default {
  name: "Login",
  setup() {
    const router = useRouter();

    const email = ref("");
    const password = ref("");

    const login = async () => {
      try {
        const res = await api.post("/auth/login", {
          email: email.value,
          password: password.value,
        });

        localStorage.setItem("token", res.data.token);
        router.push("/dashboard");
      } catch (err) {
        alert("Login failed");
      }
    };

    return {
      email,
      password,
      login,
    };
  },
};
</script>

<style scoped>
.auth-page {
  margin-top: 64px; /* 👈 NAVBAR SPACE */
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg, #64748b, #334155);
}

.auth-card {
  background: #ffffff;
  padding: 32px;
  width: 360px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.auth-card h2 {
  margin-bottom: 20px;
}

.auth-card input {
  width: 100%;
  padding: 12px;
  margin-bottom: 14px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.auth-card button {
  width: 100%;
  padding: 12px;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.auth-card button:hover {
  background: #1d4ed8;
}

.auth-card p {
  margin-top: 14px;
}
</style>
