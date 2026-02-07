<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();
const email = ref("");
const password = ref("");

const register = async () => {
  try {
    await axios.post(
      "https://addisgo.onrender.com/api/auth/register",
      {
        email: email.value,
        password: password.value,
      }
    );

    alert("Registered! Now login.");
    router.push("/login");
  } catch (err) {
    alert("Register failed");
  }
};
</script>

<template>
  <div class="auth">
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" />
    <button @click="register">Register</button>
  </div>
</template>




