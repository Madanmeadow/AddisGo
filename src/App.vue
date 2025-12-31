<template>
  <div class="app-shell">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div class="container">
        <RouterLink class="navbar-brand fw-bold" to="/">AddisGo</RouterLink>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="nav" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/services">Services</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
            <li class="nav-item ms-lg-2">
              <RouterLink class="btn btn-light btn-sm fw-semibold" to="/contact">Get in touch</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="flex-grow-1">
      <RouterView />
    </main>

    <!-- Global CTA + Footer (so it doesn't double on Services) -->
    <section class="cta-strip border-top">
      <div class="container py-4">
        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h5 class="mb-1">Ready to start? Let’s talk.</h5>
            <div class="text-muted">Tell me what you need — I’ll reply with a clear plan and next steps.</div>
          </div>
          <RouterLink to="/contact" class="btn btn-primary">Get in touch</RouterLink>
        </div>
      </div>
    </section>

    <footer class="footer bg-light border-top">
      <div class="container py-3 d-flex flex-column flex-md-row justify-content-between gap-2">
        <div class="text-muted small">© 2025 AddisGo</div>
        <div class="text-muted small">Built with Vue + Azure Static Web Apps</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.cta-strip {
  background: #f8f9fa;
}
</style>
