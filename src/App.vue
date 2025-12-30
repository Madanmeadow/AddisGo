<template>
  <SiteNavbar />

  <main>
    <RouterView />
  </main>

  <SiteFooter />
</template>

<script setup>
import { RouterView } from "vue-router"
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>
