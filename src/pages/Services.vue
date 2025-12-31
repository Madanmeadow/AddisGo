<template>
  <section class="page-hero">
    <div class="container">
      <h1 class="mb-2">Services</h1>
      <p class="lead mb-0">
        Clear packages, fast delivery, and clean modern design — built with Vue and deployed on Azure.
      </p>
    </div>
  </section>

  <section class="section-soft">
    <div class="container py-5">
      <div class="row g-4">
        <!-- Package 1 -->
        <div class="col-lg-4">
          <div class="card service-card h-100">
            <div class="card-body p-4">
              <h4 class="mb-2">Starter Site</h4>
              <p class="text-muted mb-3">Perfect for personal or small business.</p>

              <div class="price mb-3">$399–$899</div>

              <ul class="list-check mb-4">
                <li>1–3 pages (Home / About / Contact)</li>
                <li>Mobile-first responsive layout</li>
                <li>Basic SEO setup</li>
                <li>Deployed to Azure Static Web Apps</li>
              </ul>

              <RouterLink to="/contact" class="btn btn-primary w-100">
                Request this
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Package 2 -->
        <div class="col-lg-4">
          <div class="card service-card featured h-100">
            <div class="badge-feature">Most Popular</div>

            <div class="card-body p-4">
              <h4 class="mb-2">Business Pro</h4>
              <p class="text-muted mb-3">Best for services & clients.</p>

              <div class="price mb-3">$899–$1,999</div>

              <ul class="list-check mb-4">
                <li>4–6 pages + routing</li>
                <li>Hero, cards, sections, CTA buttons</li>
                <li>Contact form + validation</li>
                <li>CI/CD (GitHub → Azure deploy)</li>
              </ul>

              <RouterLink to="/contact" class="btn btn-dark w-100">
                Request this
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Package 3 -->
        <div class="col-lg-4">
          <div class="card service-card h-100">
            <div class="card-body p-4">
              <h4 class="mb-2">Fixes & Improvements</h4>
              <p class="text-muted mb-3">When your site needs a cleanup.</p>

              <div class="price mb-3">$75–$250/hr</div>

              <ul class="list-check mb-4">
                <li>Bug fixes + layout issues</li>
                <li>Speed/performance improvements</li>
                <li>Design refresh (Bootstrap cleanup)</li>
                <li>Deployment help (Azure / DNS / domains)</li>
              </ul>

              <RouterLink to="/contact" class="btn btn-outline-primary w-100">
                Ask about a fix
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Process -->
      <div class="row g-4 mt-4">
        <div class="col-lg-6">
          <div class="info-panel h-100">
            <h4 class="mb-3">How it works</h4>
            <ol class="mb-0">
              <li>Send your goals + examples you like</li>
              <li>I build a first version fast</li>
              <li>You review and request edits</li>
              <li>Deploy live on Azure</li>
            </ol>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="info-panel h-100">
            <h4 class="mb-3">What you get</h4>
            <ul class="mb-0">
              <li>Clean code (Vue + Router + Bootstrap)</li>
              <li>Mobile-first design and spacing</li>
              <li>Modern sections (hero, cards, CTA)</li>
              <li>GitHub repo + Azure deploy setup</li>
            </ul>
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
.page-hero {
  background: linear-gradient(180deg, #0b1f3a 0%, #123a67 100%);
  color: #fff;
  padding: 3.5rem 0;
}

.section-soft {
  background: #f5f7fb;
}

.service-card {
  border: 0;
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.10);
}

.featured {
  outline: 2px solid rgba(77, 171, 247, 0.35);
}

.badge-feature {
  position: absolute;
  top: 14px;
  right: 14px;
  background: #4dabf7;
  color: #0b1f3a;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
}

.price {
  font-size: 1.4rem;
  font-weight: 800;
}

.list-check {
  padding-left: 0;
  list-style: none;
}
.list-check li {
  margin-bottom: 10px;
}
.list-check li::before {
  content: "✓";
  margin-right: 10px;
  color: #228be6;
  font-weight: 800;
}

.info-panel {
  background: #fff;
  border-radius: 14px;
  padding: 1.5rem;
  border: 1px solid rgba(0,0,0,0.06);
}
</style>

