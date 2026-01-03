<!-- App.vue -->
<template>
  <header class="navbar">
    <div class="logo">AddisGo</div>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/services">Services</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
    </nav>
  </header>

  <main class="page">
    <RouterView />
  </main>

  <footer class="footer">
    © 2026 AddisGo
  </footer>
</template>
