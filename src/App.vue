<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"

// Pages
import Home from "./pages/Home.vue"
import Services from "./pages/Services.vue"
import Contact from "./pages/Contact.vue"
</script>

<template>
  <SiteNavbar />

  <main>
    <section id="home">
      <Home />
    </section>

    <section id="services">
      <Services />
    </section>

    <section id="contact">
      <Contact />
    </section>
  </main>

  <SiteFooter />
</template>

<style>
main {
  min-height: 100vh;
}
section {
  scroll-margin-top: 80px;
}
</style>
