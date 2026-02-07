<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const logout = () => {
  localStorage.removeItem("token");
  router.push("/login");
};
</script>

<template>
  <aside class="sidebar">
    <h2>AddisGo</h2>

    <button @click="$router.push('/dashboard')">🏠 Feed</button>
    <button @click="$router.push('/profile')">👤 Profile</button>
    <button @click="logout">🚪 Logout</button>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background: #111;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

button {
  background: none;
  border: none;
  color: white;
  text-align: left;
  font-size: 16px;
  cursor: pointer;
}
</style>
