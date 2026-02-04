<template>
  <div class="auth-wrapper">
    <div class="card">
      <h2>Create Account</h2>

      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <button @click="handleRegister">Register</button>

      <p>
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { register } from "../services/auth.service";

const email = ref("");
const password = ref("");
const router = useRouter();

const handleRegister = async () => {
  try {
    await register(email.value, password.value);
    router.push("/login");
  } catch (err) {
    alert("Register failed");
  }
};
</script>

