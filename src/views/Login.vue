<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();

const login = async () => {
  error.value = "";

  try {
    const res = await api.post("/api/login", {
      email: email.value,
      password: password.value,
    });

    // ✅ ensure success
    if (res.data?.success) {
      router.push("/dashboard");
    } else {
      error.value = "Login failed";
    }
  } catch (err) {
    error.value = "Invalid email or password";
    console.error("Login error:", err);
  }
};
</script>

<template>
  <!-- ❗ NO FORM TAG -->
  <div class="login">
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button type="button" @click="login">Login</button>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style>
.login {
  display: flex;
  gap: 8px;
}
.error {
  color: red;
}
</style>





