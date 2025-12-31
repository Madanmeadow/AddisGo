<template>
  <main class="page">
    <!-- Page header -->
    <section class="page-hero">
      <div class="container py-5">
        <h1 class="display-5 fw-bold mb-2">Services</h1>
        <p class="lead mb-0">Simple packages, clear pricing, and fast delivery.</p>
      </div>
    </section>

    <!-- Packages -->
    <section class="section bg-soft">
      <div class="container py-5">
        <div class="row g-4 align-items-stretch">
          <!-- Starter -->
          <div class="col-12 col-lg-4">
            <div class="card pricing-card h-100 shadow-sm">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between mb-2">
                  <h2 class="h4 fw-bold mb-0">Starter Website</h2>
                  <span class="badge text-bg-primary price-badge">$499+</span>
                </div>

                <p class="text-muted mb-4">
                  Perfect for a simple business site or personal brand.
                </p>

                <ul class="list-unstyled small text-muted mb-4">
                  <li class="mb-2">• 1–3 pages</li>
                  <li class="mb-2">• Mobile responsive</li>
                  <li class="mb-2">• Basic SEO</li>
                  <li class="mb-2">• Contact form</li>
                </ul>

                <RouterLink
                  class="btn btn-outline-primary w-100"
                  :to="{ path: '/contact', query: { package: 'Starter Website' } }"
                >
                  Request this package
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Business (featured) -->
          <div class="col-12 col-lg-4">
            <div class="card pricing-card h-100 shadow pricing-featured">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between mb-2">
                  <h2 class="h4 fw-bold mb-0">Business Website</h2>
                  <span class="badge text-bg-primary price-badge">$899+</span>
                </div>

                <p class="text-muted mb-4">
                  A polished site that builds trust and converts visitors.
                </p>

                <ul class="list-unstyled small text-muted mb-4">
                  <li class="mb-2">• Up to 6 pages</li>
                  <li class="mb-2">• Better design + sections</li>
                  <li class="mb-2">• Speed optimization</li>
                  <li class="mb-2">• Analytics setup</li>
                </ul>

                <RouterLink
                  class="btn btn-primary w-100"
                  :to="{ path: '/contact', query: { package: 'Business Website' } }"
                >
                  Request this package
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Fixes -->
          <div class="col-12 col-lg-4">
            <div class="card pricing-card h-100 shadow-sm">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between mb-2">
                  <h2 class="h4 fw-bold mb-0">Fixes & Improvements</h2>
                  <span class="badge text-bg-secondary price-badge">$75/hr</span>
                </div>

                <p class="text-muted mb-4">
                  Updates, redesigns, and performance fixes for existing sites.
                </p>

                <ul class="list-unstyled small text-muted mb-4">
                  <li class="mb-2">• Bug fixes</li>
                  <li class="mb-2">• UI clean-up</li>
                  <li class="mb-2">• Performance</li>
                  <li class="mb-2">• Deployment help</li>
                </ul>

                <RouterLink
                  class="btn btn-outline-primary w-100"
                  :to="{ path: '/contact', query: { package: 'Fixes & Improvements' } }"
                >
                  Request a quote
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Small helper CTA (NOT the big footer CTA) -->
        <div class="text-center mt-5">
          <p class="mb-3 text-muted">
            Not sure which package fits? Send a message and I’ll recommend the best option.
          </p>
          <RouterLink class="btn btn-primary" to="/contact">
            Get a free plan
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
// No JS needed here
</script>

<style scoped>
.page-hero {
  background: radial-gradient(1200px 600px at 20% 10%, rgba(255, 255, 255, 0.14), transparent 60%),
    linear-gradient(120deg, #123c7a, #1b5fb8);
  color: #fff;
}

.bg-soft {
  background: #f6f8fb;
}

.pricing-card {
  border: 0;
  border-radius: 14px;
}

.price-badge {
  font-weight: 700;
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
}

.pricing-featured {
  transform: translateY(-6px);
}

@media (max-width: 991px) {
  .pricing-featured {
    transform: none;
  }
}
</style>
