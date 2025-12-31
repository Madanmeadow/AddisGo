<template>
  <!-- HERO -->
  <section class="hero-section text-light">
    <div class="container">
      <div class="row align-items-center g-5">
        <!-- Left -->
        <div class="col-lg-7">
          <h1 class="display-5 fw-bold mb-3">
            Addis<span class="text-accent">Go</span>
          </h1>

          <p class="lead mb-4">
            Clean, modern websites — built with Vue & Azure Static Web Apps.
          </p>

          <div class="d-flex gap-3 flex-wrap mb-3">
            <!-- ✅ THESE BUTTONS -->
            <RouterLink
              to="/contact"
              class="btn btn-primary btn-glow btn-hero"
            >
              Get in touch
            </RouterLink>

            <RouterLink
              to="/services"
              class="btn btn-outline-light btn-hero"
            >
              View services
            </RouterLink>
          </div>

          <p class="small text-muted">
            Quick turnaround · Mobile-first · Professional look
          </p>
        </div>

        <!-- Right -->
        <div class="col-lg-5">
          <div class="why-card shadow-sm">
            <h5 class="fw-semibold mb-3">Why AddisGo?</h5>
            <ul class="list-unstyled mb-0">
              <li>✔ Fast & responsive design</li>
              <li>✔ Clean UI / UX</li>
              <li>✔ Azure deployment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- WHAT WE DO -->
  <section v-reveal class="py-5 section-soft">
    <div class="container">
      <h2 class="fw-semibold mb-4 text-center">What we do</h2>

      <div class="row g-4">
        <div class="col-md-4">
          <div class="service-card h-100">
            <h5>Websites</h5>
            <p>
              Business websites, landing pages, and personal portfolios built
              with modern tools.
            </p>
          </div>
        </div>

        <div class="col-md-4">
          <div class="service-card h-100">
            <h5>Fixes & Improvements</h5>
            <p>
              Bug fixes, redesigns, performance improvements, and UI clean-ups.
            </p>
          </div>
        </div>

        <div class="col-md-4">
          <div class="service-card h-100">
            <h5>Deployment</h5>
            <p>
              Azure Static Web Apps, CI/CD, custom domains, and hosting setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
/* HERO */
.hero-section {
  background: linear-gradient(
    135deg,
    #0b3c6d,
    #0d6efd
  );
  padding: 5rem 0;
}

.text-accent {
  color: #7dd3fc;
}

/* WHY CARD */
.why-card {
  background: rgba(255, 255, 255, 0.85);
  color: #111;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

/* SERVICES */
.section-soft {
  background: #f8fafc;
}

.service-card {
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}
</style>
