<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../services/api";


const email = ref("");
const password = ref("");
const router = useRouter();

const register = async () => {
  try {
    await api.post("/api/auth/register", {
      email: email.value,
      password: password.value,
    });

    router.push("/login");
  } catch (err) {
    alert("Register failed");
  }
};
</script>

<template>
  <div class="auth">
    <h2>Register</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="register">Register</button>
  </div>
</template>




