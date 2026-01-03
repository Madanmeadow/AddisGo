<template>
  <nav class="navbar">
    <div class="container">
      <h1 class="logo">AddisGo</h1>

      <ul class="nav-links">
        <li><RouterLink to="/">Home</RouterLink></li>
        <li><RouterLink to="/services">Services</RouterLink></li>
        <li><RouterLink to="/contact">Contact</RouterLink></li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

<style scoped>
.navbar {
  background: #1e5bd7;
  padding: 15px 0;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  color: white;
  font-size: 22px;
}

.nav-links {
  display: flex;
  gap: 20px;
  list-style: none;
}

.nav-links a {
  color: white;
  text-decoration: none;
  font-weight: 500;
}

.nav-links a.router-link-active {
  text-decoration: underline;
}
</style>
