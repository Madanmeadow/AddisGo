<template>
  <<template>
  <!-- HERO -->
  <section class="hero">
    <div class="container py-5">
      <div class="row align-items-center g-4">
        <div class="col-lg-7">
          <h1 class="hero-title display-4 fade-up">
            <span class="brand">AddisGo</span>
          </h1>

          <p class="hero-subtitle lead mt-3 fade-up delay-1">
            Clean, modern websites — built with Vue + Azure Static Web Apps.
            Fast, responsive, and designed to look professional on every screen.
          </p>

          <div class="d-flex flex-wrap gap-2 mt-4 fade-up delay-2">
            <RouterLink class="btn btn-primary btn-lg" to="/contact">Get in touch</RouterLink>
            <RouterLink class="btn btn-outline-light btn-lg" to="/services">View services</RouterLink>
          </div>

          <div class="mt-4 text-white-50 small fade-up delay-3">
            Typical turnaround: 3–7 days depending on scope.
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card card-hover rounded-4 shadow-sm">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-2">What you get</h5>
              <ul class="mb-0 text-muted">
                <li>Mobile-first layout</li>
                <li>Clean navigation + routing</li>
                <li>Modern sections (hero, cards, footer)</li>
                <li>Ready to deploy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- WHAT WE DO -->
  <section class="section-soft py-5">
    <div class="container">
      <div class="d-flex align-items-end justify-content-between gap-2 flex-wrap mb-3">
        <h2 class="fw-bold mb-0">What we do</h2>
        <RouterLink class="small text-decoration-none" to="/services">See full services →</RouterLink>
      </div>

      <div class="row g-3 g-md-4">
        <div class="col-md-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Websites</h5>
              <p class="text-muted mb-0">
                Simple business sites, landing pages, portfolios — clean and modern.
              </p>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Fixes & Improvements</h5>
              <p class="text-muted mb-0">
                Bug fixes, design cleanup, performance, accessibility, and updates.
              </p>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Deployments</h5>
              <p class="text-muted mb-0">
                Azure deploy, custom domains, and simple CI/CD setup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-5">
    <div class="container">
      <div class="p-4 p-md-5 bg-white border rounded-4">
        <div class="row align-items-center g-3">
          <div class="col-lg-8">
            <h3 class="fw-bold mb-2">Need a clean website this week?</h3>
            <p class="text-muted mb-0">
              Tell me what you want, show examples you like, and I’ll build it fast and clean.
            </p>
          </div>
          <div class="col-lg-4 text-lg-end">
            <RouterLink class="btn btn-primary btn-lg" to="/contact">Contact</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

  <section class="hero">
    <div class="container py-5">
      <div class="row align-items-center g-4">
        <div class="col-lg-7">
          <h1 class="display-4 hero-animate">
            <span class="brand-gradient">AddisGo</span>
          </h1>

          <p class="lead lead-muted hero-animate delay-1">
            Clean, modern websites — built with Vue + Azure Static Web Apps.
          </p>

          <div class="d-flex flex-wrap gap-2 hero-animate delay-2">
            <router-link class="btn btn-primary px-4" to="/contact">Get in touch</router-link>
            <router-link class="btn btn-outline-light px-4" to="/services">View services</router-link>
          </div>

          <div class="mt-4 hero-animate delay-3 small" style="color: rgba(233,238,252,0.6);">
            Quick turnaround • Mobile-first • Professional look
          </div>
        </div>

        <div class="col-lg-5">
          <div class="section-soft p-4">
            <h5 class="mb-2 section-title">Fast • Responsive • Deploy-ready</h5>
            <p class="mb-0 lead-muted">
              Built to look great on phone + desktop, with smooth navigation and clean sections.
              Ready for custom domains, CI/CD, and Azure hosting.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- WHAT WE DO -->
  <section class="container py-5">
    <div class="mb-4">
      <h2 class="section-title">What we do</h2>
      <p class="lead-muted mb-0">
        Simple services that make your website look better, load faster, and convert more visitors.
      </p>
    </div>

    <div class="row g-4">
      <div class="col-md-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h5 class="card-title">Websites</h5>
            <p class="text-muted mb-0">
              Clean business sites, landing pages, portfolios, and simple multi-page sites.
            </p>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h5 class="card-title">Fixes & Improvements</h5>
            <p class="text-muted mb-0">
              Bug fixes, design cleanup, mobile spacing, performance, and SEO basics.
            </p>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h5 class="card-title">Deployments</h5>
            <p class="text-muted mb-0">
              Azure deploy, custom domains, GitHub Actions, environment variables, CI/CD.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA strip -->
    <div class="section-soft p-4 mt-5">
      <div class="row align-items-center g-3">
        <div class="col-lg-8">
          <h4 class="mb-1 section-title">Want a clean website that looks legit?</h4>
          <div class="lead-muted mb-0">Tell me what you need and I’ll reply with a simple plan + timeline.</div>
        </div>
        <div class="col-lg-4 text-lg-end">
          <router-link class="btn btn-primary px-4" to="/contact">Contact</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>
