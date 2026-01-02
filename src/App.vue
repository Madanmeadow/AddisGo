<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import Home from "./pages/Home.vue"
import Services from "./pages/Services.vue"
import Contact from "./pages/Contact.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>

<template>
  <SiteNavbar />

  <main>
    <Home />
    <Services />
    <Contact />
  </main>

  <SiteFooter />
</template>

<style scoped>
main {
  margin-top: 70px;
}
</style>
