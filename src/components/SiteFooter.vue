<template>
  <footer class="site-footer mt-auto">
    <div class="container py-5">
      <div class="footer-cta rounded-4 p-4 p-md-5 shadow-sm">
        <div class="row align-items-center g-3">
          <div class="col-md-8">
            <h3 class="mb-2 fw-bold text-white">Ready to start? Let’s talk.</h3>
            <p class="mb-0 text-white-50">
              Tell me what you need and I’ll reply with a clear plan and next steps.
            </p>
          </div>

          <div class="col-md-4 text-md-end">
            <RouterLink to="/contact" class="btn btn-light btn-lg px-4 footer-cta-btn">
              Get in touch
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 pt-4 text-white-50">
        <small>© {{ new Date().getFullYear() }} AddisGo</small>
        <small>Built with Vue + Azure Static Web Apps</small>
      </div>
    </div>
  </footer>
</template>

<script setup>
</script>

<style scoped>
.site-footer {
  background: #0b1220;
  border-top: 1px solid rgba(255,255,255,.08);
}
.footer-cta {
  background: linear-gradient(135deg, rgba(59,130,246,.35), rgba(99,102,241,.25));
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
}
.footer-cta-btn {
  transition: transform .2s ease, box-shadow .2s ease;
}
.footer-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0,0,0,.25);
}
</style>
