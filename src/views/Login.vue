<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/services/auth.service";

const email = ref("");
const password = ref("");
const router = useRouter();

const submit = async () => {
  try {
    await login(email.value, password.value);
    router.push("/dashboard");
  } catch {
    alert("Login failed");
  }
};
</script>

<template>
  <div class="auth">
    <h2>Login</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="submit">Login</button>
    <p>No account? <router-link to="/register">Register</router-link></p>
  </div>
</template>

