<template>
  <div class="auth">
    <div class="card">
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

      <p class="link">
        No account?
        <router-link to="/register">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

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
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card {
  background: white;
  padding: 30px;
  border-radius: 14px;
  width: 320px;
  text-align: center;
}

input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
}

button {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background: #3aaed8;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.link {
  margin-top: 15px;
}
</style>
