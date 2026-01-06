<template>
  <div class="app-shell">
    <!-- NAVBAR -->
    <header class="site-header">
      <div class="nav-wrap">
        <RouterLink class="brand" to="/">AddisGo</RouterLink>

        <nav class="nav-links" aria-label="Main Navigation">
          <RouterLink to="/" class="nav-link">Home</RouterLink>
          <RouterLink to="/services" class="nav-link">Services</RouterLink>
          <RouterLink to="/contact" class="nav-link">Contact</RouterLink>
        </nav>
      </div>
    </header>

    <!-- PAGE CONTENT -->
    <main class="site-main">
      <RouterView />
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
      <p>© {{ new Date().getFullYear() }} AddisGo</p>
    </footer>
  </div>
</template>

<script setup>
/*
  IMPORTANT:
  - App.vue should ONLY contain shared layout:
    navbar + RouterView + footer
  - Do NOT put Home/Services/Contact content here.
*/
</script>

<style>
/* Global layout */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f6f9;
}

/* Header / Navbar */
.site-header {
  background: #1f5fe0;
}

.nav-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand {
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  text-decoration: none;
  letter-spacing: 0.3px;
}

/* Nav links */
.nav-links {
  display: flex;
  gap: 22px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.95);
  text-decoration: none;
  font-size: 18px;
  padding: 6px 2px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  border-bottom-color: rgba(255, 255, 255, 0.8);
}

.router-link-active.nav-link {
  border-bottom-color: rgba(255, 255, 255, 0.95);
}

/* Main content area */
.site-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 20px;
}

/* Footer */
.site-footer {
  background: #1f5fe0;
  color: #fff;
  text-align: center;
  padding: 18px 10px;
}

/* Mobile */
@media (max-width: 520px) {
  .nav-wrap {
    align-items: flex-start;
    flex-direction: column;
  }

  .brand {
    font-size: 30px;
  }

  .nav-links {
    gap: 18px;
  }
}
</style>
