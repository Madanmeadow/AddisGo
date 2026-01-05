<template>
  <div class="app">
    <!-- NAVBAR -->
    <header class="navbar">
      <div class="navbar__inner">
        <RouterLink class="brand" to="/">AddisGo</RouterLink>

        <nav class="navlinks">
          <RouterLink class="navlink" to="/" exact-active-class="active">Home</RouterLink>
          <RouterLink class="navlink" to="/services" exact-active-class="active">Services</RouterLink>
          <RouterLink class="navlink" to="/contact" exact-active-class="active">Contact</RouterLink>
        </nav>
      </div>
    </header>

    <!-- PAGE CONTENT -->
    <main class="page">
      <RouterView />
    </main>

    <!-- FOOTER -->
    <footer class="footer">
      © 2026 AddisGo
    </footer>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router"
</script>

<style>
/* App layout */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navbar */
.navbar {
  background: #1f5ed8;
  padding: 18px 0;
}

.navbar__inner {
  width: min(1100px, 92%);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  color: white;
  font-size: 32px;
  font-weight: 700;
  text-decoration: none;
}

.navlinks {
  display: flex;
  gap: 28px;
}

.navlink {
  color: white;
  text-decoration: none;
  font-weight: 500;
  opacity: 0.95;
}

.navlink.active {
  text-decoration: underline;
  text-underline-offset: 6px;
}

/* Page area */
.page {
  flex: 1;
  background: #f3f6fb;
  padding: 40px 0;
}

/* Footer */
.footer {
  background: #1f5ed8;
  color: white;
  text-align: center;
  padding: 18px 0;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .navbar__inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .navlinks {
    gap: 16px;
    flex-wrap: wrap;
  }

  .brand {
    font-size: 28px;
  }

  .page {
    padding: 24px 0;
  }
}
</style>
