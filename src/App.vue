<template>
  <div class="app-shell d-flex flex-column min-vh-100">
    <SiteNavbar />
    <main class="flex-grow-1">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>
