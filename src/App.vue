<template>
  <div id="app">
    <SiteNavbar />

    <main class="main">
      <router-view />
    </main>

    <SiteFooter />
  </div>
</template>

<script setup>
import SiteNavbar from "./components/SiteNavbar.vue"
import SiteFooter from "./components/SiteFooter.vue"
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding: 60px 20px;
  background: #f8f9fb;
}
</style>
