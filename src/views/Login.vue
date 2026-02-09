<template>
  <div>
    <h1>Login</h1>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>

    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "@/services/api";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");

const login = async () => {
  try {
    const res = await api.post("/auth/login", {
      email: email.value,
      password: password.value
    });

    localStorage.setItem("token", res.data.token);
    router.push("/dashboard");
  } catch (err) {
    error.value = err.response?.data?.message || "Login failed";
  }
};
</script>





