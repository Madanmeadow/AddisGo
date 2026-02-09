<script setup>
import { useAuthStore } from "@/stores/auth.store";
const auth = useAuthStore();
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p>Welcome to AddisGo 🌍🔥</p>
    <button @click="auth.logout()">Logout</button>
  </div>
</template>



