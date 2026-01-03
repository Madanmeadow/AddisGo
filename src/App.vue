<template>
  <div id="app">
    <header class="navbar">
      <h1 class="logo">AddisGo</h1>
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
  </div>
</template>
