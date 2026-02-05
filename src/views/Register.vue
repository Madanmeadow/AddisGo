<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { register } from "@/services/auth.service";

const email = ref("");
const password = ref("");
const router = useRouter();

const submit = async () => {
  await register(email.value, password.value);
  router.push("/login");
};
</script>

<template>
  <div class="auth">
    <h2>Register</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="submit">Register</button>
  </div>
</template>

