<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api"; // ✅ DEFAULT IMPORT

const email = ref("");
const password = ref("");
const router = useRouter();

const login = async () => {
  try {
    const res = await api.post("/auth/login", {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem("token", res.data.token);
    router.push("/dashboard");
  } catch (err) {
    alert("Login failed");
  }
};
</script>

<template>
  <div class="auth">
    <h2>Login</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="login">Login</button>
  </div>
</template>


<template>
  <div class="auth">
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>
  </div>
</template>





