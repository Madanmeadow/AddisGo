<template>
  <div class="auth">
    <h1>Welcome back</h1>
    <p class="subtitle">Log in to MeDan</p>

    <form @submit.prevent="login">
      <input
        type="email"
        v-model="email"
        placeholder="Email"
        required
      />

      <input
        type="password"
        v-model="password"
        placeholder="Password"
        required
      />

      <button type="submit" :disabled="loading">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </form>

    <p class="switch">
      No account?
      <router-link to="/register">Register</router-link>
    </p>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const login = async () => {
  error.value = "";
  loading.value = true;

  try {
    const res = await api.post("/auth/login", {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem("token", res.data.token);
    router.push("/dashboard");
  } catch (err) {
    error.value =
      err.response?.data?.message || "Login failed";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth {
  max-width: 380px;
  margin: 120px auto;
  padding: 30px;
  background: #fff;
  border-radius: 14px;
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
  background: #3aaed8;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.error {
  margin-top: 10px;
  color: red;
}

.switch {
  margin-top: 15px;
}

.subtitle {
  color: #666;
}
</style>
