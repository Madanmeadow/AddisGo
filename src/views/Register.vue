<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const register = async () => {
  await api.post("/auth/register", {
    email: email.value,
    password: password.value,
  });
  router.push("/login");
};
</script>

<template>
  <div>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" />
    <button @click="register">Register</button>
  </div>
</template>




