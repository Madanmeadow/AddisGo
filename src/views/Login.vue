<script setup>
import { ref } from "vue";
import { login } from "@/services/auth.service";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();

async function handleLogin() {
  error.value = "";
  try {
    const data = await login(email.value, password.value);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    router.push("/dashboard");
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div class="auth">
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="handleLogin">Login</button>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.auth {
  max-width: 300px;
  margin: auto;
}
.error {
  color: red;
}
</style>

