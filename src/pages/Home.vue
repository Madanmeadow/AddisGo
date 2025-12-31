<template>
  <!-- HERO -->
  <section class="hero">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-lg-7">
          <h1 class="hero-title animate-fade">
            Addis<span class="brand-accent">Go</span>
          </h1>

          <p class="hero-subtitle mt-3">
            Clean, modern websites — built with
            <strong>Vue</strong> & <strong>Azure Static Web Apps</strong>.
          </p>

          <div class="d-flex gap-3 mt-4 flex-wrap">
            <RouterLink to="/contact" class="btn btn-primary btn-lg">
              Get in touch
            </RouterLink>

            <RouterLink to="/services" class="btn btn-outline-light btn-lg">
              View services
            </RouterLink>
          </div>

          <p class="hero-meta mt-4">
            Quick turnaround • Mobile-first • Professional look
          </p>
        </div>

        <div class="col-lg-5 d-none d-lg-block">
          <div class="hero-card shadow-sm">
            <p class="mb-2 fw-semibold">Why AddisGo?</p>
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
  <section class="section-soft">
    <div class="container py-5">
      <h2 class="mb-4 text-center">What we do</h2>

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
import { RouterLink } from "vue-router"
</script>

<style scoped>
/* HERO */
.hero {
  background: linear-gradient(
    180deg,
    #0b1f3a 0%,
    #123a67 55%,
    #0b1f3a 100%
  );
  color: #fff;
  padding: 5rem 0;
  min-height: 520px;
  display: flex;
  align-items: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.brand-accent {
  color: #4dabf7;
}

.hero-subtitle {
  font-size: 1.15rem;
  max-width: 520px;
  opacity: 0.95;
}

.hero-meta {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Right card */
.hero-card {
  background: #ffffff;
  color: #1f2937;
  border-radius: 12px;
  padding: 1.5rem;
}

/* WHAT WE DO */
.section-soft {
  background: #f5f7fb;
}

.service-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

/* Animation */
.animate-fade {
  animation: fadeUp 0.7s ease forwards;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .hero {
    padding: 3.5rem 0;
    min-height: auto;
  }

  .hero-title {
    font-size: 2.3rem;
  }
}
</style>
