<template>
  <div class="auth">
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>

    <p>
      No account?
      <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const router = useRouter();

const login = async () => {
  try {
    await api.post("/auth/login", {
      email: email.value,
      password: password.value,
    });

    router.push("/dashboard");
  } catch (err) {
    alert("Login failed");
  }
};
</script>



