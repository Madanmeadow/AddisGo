<template>
  <div class="app-shell">
    <SiteNavbar />
    <main class="page-main">
      <router-view />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>

