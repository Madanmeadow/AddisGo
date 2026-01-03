<template>
  <header class="site-header">
    <div class="container nav-inner">
      <RouterLink class="brand" to="/">AddisGo</RouterLink>

      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/services">Services</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
      </nav>
    </div>
  </header>

  <main class="page">
    <div class="container">
      <RouterView />
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">© 2026 AddisGo</div>
  </footer>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router"
</script>
