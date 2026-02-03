<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>Create Account</h2>

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

      <button @click="register">Register</button>

      <p>
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import api from "../services/api";
import { useRouter } from "vue-router";
import { ref } from "vue";

export default {
  name: "Register",
  setup() {
    const router = useRouter();

    const email = ref("");
    const password = ref("");

    const register = async () => {
      try {
        await api.post("/auth/register", {
          email: email.value,
          password: password.value,
        });

        router.push("/login");
      } catch (err) {
        alert("Registration failed");
      }
    };

    return {
      email,
      password,
      register,
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
  background: #14b8a6;
  color: white;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.auth-card button:hover {
  background: #0d9488;
}

.auth-card p {
  margin-top: 14px;
}
</style>

