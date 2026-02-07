<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const register = async () => {
  await api.post("/api/register", { email: email.value, password: password.value });
  router.push("/login");
};
</script>

<template>
  <input v-model="email" placeholder="Email" />
  <input v-model="password" type="password" placeholder="Password" />
  <button @click="register">Register</button>
</template>






