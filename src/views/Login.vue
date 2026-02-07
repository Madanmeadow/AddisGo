<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const login = async () => {
  await api.post("/api/login", { email: email.value, password: password.value });
  router.push("/dashboard");
};
</script>

<template>
  <input v-model="email" placeholder="Email" />
  <input v-model="password" type="password" placeholder="Password" />
  <button @click="login">Login</button>
</template>





