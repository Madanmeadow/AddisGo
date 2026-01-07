<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink class="brand" to="/">MeDan</RouterLink>

        <nav class="nav">
          <RouterLink class="nav-link" to="/" exact-active-class="active">Home</RouterLink>
          <RouterLink class="nav-link" to="/services" exact-active-class="active">Services</RouterLink>
          <RouterLink class="nav-link" to="/contact" exact-active-class="active">Contact</RouterLink>
        </nav>
      </div>
    </header>

    <main class="page">
      <RouterView />
    </main>

    <footer class="footer">
      <p>© {{ new Date().getFullYear() }} MeDan</p>
    </footer>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router"
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: #1f5fd6;
  color: white;
}

.topbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand {
  color: white;
  text-decoration: none;
  font-weight: 800;
  font-size: 34px;
  letter-spacing: 0.5px;
}

.nav {
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
}

.nav-link {
  color: rgba(255, 255, 255, 0.95);
  text-decoration: none;
  font-size: 18px;
  padding: 6px 10px;
  border-radius: 10px;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.12);
}

.active {
  text-decoration: underline;
  text-underline-offset: 8px;
}

.page {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 28px 18px 60px;
}

.footer {
  background: #1f5fd6;
  color: white;
  padding: 14px 18px;
  text-align: center;
}
</style>
