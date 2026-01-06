<script setup>
import { RouterLink, RouterView } from "vue-router"
import { siteConfig } from "./config/site"
</script>

<template>
  <div class="app">
    <header class="topbar">
      <RouterLink to="/" class="brand-link">{{ siteConfig.brandName }}</RouterLink>

      <nav class="nav">
        <RouterLink to="/" class="nav-link" exact-active-class="active">Home</RouterLink>
        <RouterLink to="/services" class="nav-link" exact-active-class="active">Services</RouterLink>
        <RouterLink to="/contact" class="nav-link" exact-active-class="active">Contact</RouterLink>
      </nav>
    </header>

    <main class="page">
      <RouterView />
    </main>

    <footer class="footer">
      © {{ new Date().getFullYear() }} {{ siteConfig.brandName }}
    </footer>
  </div>
</template>
