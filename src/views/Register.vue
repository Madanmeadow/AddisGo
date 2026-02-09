<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const auth = useAuthStore();
const router = useRouter();

const submit = async () => {
  await auth.registerUser({
    name: name.value,
    email: email.value,
    password: password.value,
  });
  router.push("/dashboard");
};
</script>

<template>
  <div class="auth">
    <h1>Create Account</h1>
    <input v-model="name" placeholder="Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="submit">Register</button>
  </div>
</template>






