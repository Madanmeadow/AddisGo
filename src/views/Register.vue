<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const register = async () => {
  const res = await api.post("/auth/register", {
    email: email.value,
    password: password.value
  });

  localStorage.setItem("token", res.data.token);
  router.push("/dashboard");
};
</script>

<template>
  <div class="auth">
    <h2>Register</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="register">Create Account</button>
  </div>
</template>


