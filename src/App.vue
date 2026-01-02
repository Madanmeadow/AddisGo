<template>
  <SiteNavbar />
  <main>
    <router-view />
  </main>
  <SiteFooter />
</template>

<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>

<style>
main {
  min-height: 70vh;
}
</style>
