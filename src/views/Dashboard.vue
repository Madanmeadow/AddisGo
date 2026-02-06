<script setup>
const user = JSON.parse(localStorage.getItem("user"));
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p v-if="user">Welcome, {{ user.email }}</p>
  </div>
</template>

