<template>
  <div>
    <h2>Login</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="submit">Login</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const submit = async () => {
  const res = await login({
    email: email.value,
    password: password.value
  });

  localStorage.setItem("token", res.data.token);
  router.push("/dashboard");
};
</script>

