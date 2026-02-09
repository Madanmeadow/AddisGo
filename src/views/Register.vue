<template>
  <div>
    <h1>Create Account</h1>

    <input v-model="name" placeholder="Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="register">Register</button>

    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "@/services/api";
import { useRouter } from "vue-router";

const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");

const register = async () => {
  try {
    await api.post("/auth/register", {
      name: name.value,
      email: email.value,
      password: password.value
    });
    router.push("/login");
  } catch (err) {
    error.value = err.response?.data?.message || "Register failed";
  }
};
</script>






