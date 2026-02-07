<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();
const email = ref("");
const password = ref("");

const login = async () => {
  try {
    const res = await axios.post(
      "https://addisgo.onrender.com/api/auth/login",
      {
        email: email.value,
        password: password.value,
      }
    );

    localStorage.setItem("token", res.data.token);
    router.push("/dashboard");
  } catch (err) {
    alert("Login failed");
  }
};
</script>

<template>
  <div class="auth">
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="login">Login</button>
  </div>
</template>





