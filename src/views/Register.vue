<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api"; // ✅ DEFAULT IMPORT

const name = ref("");
const email = ref("");
const password = ref("");
const router = useRouter();

const register = async () => {
  try {
    await api.post("/auth/register", {
      name: name.value,
      email: email.value,
      password: password.value,
    });

    router.push("/login");
  } catch (err) {
    alert("Registration failed");
  }
};
</script>

<template>
  <div class="auth">
    <h2>Register</h2>
    <input v-model="name" placeholder="Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="register">Create Account</button>
  </div>
</template>





