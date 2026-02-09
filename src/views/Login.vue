<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const auth = useAuthStore();
const router = useRouter();

const submit = async () => {
  await auth.loginUser({ email: email.value, password: password.value });
  router.push("/dashboard");
};
</script>

<template>
  <div class="auth">
    <h1>Login</h1>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="submit">Login</button>
  </div>
</template>





