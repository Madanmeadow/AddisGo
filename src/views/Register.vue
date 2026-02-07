<template>
  <div>
    <h2>Register</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="register">Register</button>
    <p @click="$router.push('/login')">Already have an account?</p>
    <p style="color:red">{{ error }}</p>
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

const register = async () => {
  try {
    await api.post("/api/auth/register", {
      email: email.value,
      password: password.value,
    });
    router.push("/login");
  } catch {
    error.value = "Registration failed";
  }
};
</script>






