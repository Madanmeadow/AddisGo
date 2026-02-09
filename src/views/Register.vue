<template>
  <div>
    <h2>Register</h2>

    <input v-model="name" placeholder="Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="handleRegister">Register</button>

    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { register } from "../services/auth.service";
import { useRouter } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();

const handleRegister = async () => {
  try {
    await register({
      name: name.value,
      email: email.value,
      password: password.value,
    });

    router.push("/login");
  } catch (err) {
    error.value = err.response?.data?.message || "Register failed";
  }
};
</script>




