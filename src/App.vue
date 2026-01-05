<template>
  <div class="site">
    <header class="navbar">
      <RouterLink class="brand-link" to="/">AddisGo</RouterLink>

      <nav class="navlinks">
        <RouterLink class="nav-link" to="/" exact-active-class="active">Home</RouterLink>
        <RouterLink class="nav-link" to="/services" active-class="active">Services</RouterLink>
        <RouterLink class="nav-link" to="/contact" active-class="active">Contact</RouterLink>
      </nav>
    </header>

    <main class="page">
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

