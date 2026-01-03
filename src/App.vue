<template>
  <div class="layout">
    <header class="topbar">
      <div class="brand">AddisGo</div>

      <nav class="nav">
        <RouterLink class="nav-link" to="/">Home</RouterLink>
        <RouterLink class="nav-link" to="/services">Services</RouterLink>
        <RouterLink class="nav-link" to="/contact">Contact</RouterLink>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="footer">
      © 2026 AddisGo
    </footer>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router"
</script>
