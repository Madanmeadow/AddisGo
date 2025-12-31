<template>
  <footer class="site-footer mt-auto">
    <div class="footer-cta">
      <div class="container py-4">
        <div class="row align-items-center g-3">
          <div class="col-md-8">
            <h3 class="mb-1 fw-semibold">Ready to start? Let’s talk.</h3>
            <p class="mb-0 text-muted">
              Tell me what you need and I’ll reply with a clear plan and next steps.
            </p>
          </div>
          <div class="col-md-4 text-md-end">
            <RouterLink to="/contact" class="btn btn-primary btn-glow btn-cta">
              Get in touch
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container py-3 d-flex flex-column flex-md-row gap-2 justify-content-between">
        <div class="small text-muted">© {{ new Date().getFullYear() }} AddisGo</div>
        <div class="small text-muted">Built with Vue + Azure Static Web Apps</div>
      </div>
    </div>
  </footer>
</template>

<script setup>
</script>

<style scoped>
.site-footer {
  border-top: 1px solid rgba(255,255,255,0.08);
}
.footer-cta {
  background: rgba(255,255,255,0.70);
  backdrop-filter: blur(6px);
}
.footer-bottom {
  background: rgba(0,0,0,0.25);
}
.btn-cta {
  padding: 0.75rem 1.1rem;
}
</style>
