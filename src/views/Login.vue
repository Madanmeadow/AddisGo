<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();

const login = async () => {
  try {
    const res = await api.post("/auth/login", {
      email: email.value,
      password: password.value
    });

    localStorage.setItem("token", res.data.token);
    router.push("/dashboard"); // ✅ THIS WAS MISSING
  } catch (err) {
    error.value = "Invalid login";
  }
};
</script>

<template>
  <div class="auth">
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>

    <p v-if="error" style="color:red">{{ error }}</p>

    <p>
      No account?
      <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>


