<template>
  <section class="page-hero text-light">
    <div class="container py-5">
      <h1 class="fw-bold mb-2">Services</h1>
      <p class="lead mb-0">Simple packages, clear pricing, and fast delivery.</p>
    </div>
  </section>

  <section class="py-5 bg-soft">
    <div class="container">
      <div class="row g-4">
        <div v-for="(s, i) in data.services" :key="i" class="col-md-4">
          <div class="price-card h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h4 class="fw-bold mb-0">{{ s.title }}</h4>
              <span class="badge bg-primary fs-6">{{ s.price }}</span>
            </div>

            <p class="text-muted">{{ s.desc }}</p>

            <ul class="mb-4">
              <li v-for="(item, idx) in s.items" :key="idx">{{ item }}</li>
            </ul>

            <RouterLink to="/contact" class="btn btn-outline-primary w-100">
              Request this package
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="mt-5 text-center">
        <p class="text-muted mb-2">
          Not sure which package fits? Send a message and I’ll recommend the best option.
        </p>
        <RouterLink to="/contact" class="btn btn-primary btn-glow">
          Get a free plan
        </RouterLink>
      </div>
    </div>
  </section>

  <FooterCTA :title="data.contact.ctaTitle" :text="data.contact.ctaText" />
</template>

<script setup>
import FooterCTA from "../components/FooterCTA.vue"
import { siteData as data } from "../content/siteData"
</script>

<style scoped>
.page-hero {
  background: linear-gradient(135deg, #0b3c6d, #0d6efd);
}
.bg-soft {
  background: #f8fafc;
}
.price-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(0,0,0,0.06);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.price-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 26px rgba(0,0,0,0.08);
}
</style>

