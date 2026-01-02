<template>
  <header class="topbar">
    <div class="brand">AddisGo</div>

    <nav class="nav">
      <RouterLink class="link" to="/">Home</RouterLink>
      <RouterLink class="link" to="/services">Services</RouterLink>
      <RouterLink class="link" to="/contact">Contact</RouterLink>
    </nav>
  </header>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

<style scoped>
.topbar {
  background: #0a56c2;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.3px;
}

.nav {
  display: flex;
  gap: 18px;
}

.link {
  color: white;
  text-decoration: none;
  font-weight: 600;
  opacity: 0.9;
}

.link:hover {
  opacity: 1;
  text-decoration: underline;
}

.router-link-active {
  text-decoration: underline;
  opacity: 1;
}
</style>
