<template>
  <section class="container py-5">
    <div class="mb-4">
      <h1 class="section-title">Services</h1>
      <p class="lead lead-muted mb-0">
        Choose a simple package, or mix and match. Everything is responsive and clean.
      </p>
    </div>

    <!-- Service Cards -->
    <div class="row g-4">
      <div class="col-lg-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h4 class="mb-1">Landing Page</h4>
            <div class="lead-muted mb-3">Perfect for one offer or one product.</div>

            <ul class="lead-muted">
              <li>Hero section + call-to-action</li>
              <li>Features / benefits section</li>
              <li>Contact section</li>
              <li>Mobile-first layout</li>
            </ul>

            <div class="section-soft p-3 mt-3">
              <strong>Typical range:</strong> $250 – $900
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h4 class="mb-1">Business Website</h4>
            <div class="lead-muted mb-3">Multi-page site that looks professional.</div>

            <ul class="lead-muted">
              <li>Home / About / Services / Contact</li>
              <li>Navbar + routing</li>
              <li>Cards, spacing, clean layout</li>
              <li>Deployment-ready</li>
            </ul>

            <div class="section-soft p-3 mt-3">
              <strong>Typical range:</strong> $900 – $2,500
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h4 class="mb-1">Fixes & Improvements</h4>
            <div class="lead-muted mb-3">For existing sites that need cleanup.</div>

            <ul class="lead-muted">
              <li>Mobile spacing fixes</li>
              <li>UI cleanup + consistency</li>
              <li>Performance basics</li>
              <li>Small feature updates</li>
            </ul>

            <div class="section-soft p-3 mt-3">
              <strong>Typical range:</strong> $50 – $500 (depends on scope)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Details -->
    <div class="row g-4 mt-4">
      <div class="col-lg-7">
        <div class="section-soft p-4 h-100">
          <h3 class="section-title mb-3">What you get</h3>
          <ul class="lead-muted mb-0">
            <li><strong>Modern layout:</strong> clean sections, consistent spacing, good typography.</li>
            <li><strong>Responsive:</strong> built for phones first, then desktop.</li>
            <li><strong>Deploy-ready:</strong> GitHub Actions + Azure Static Web Apps support.</li>
            <li><strong>Easy updates:</strong> organized components and pages.</li>
          </ul>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h3 class="section-title mb-3">FAQ</h3>

            <div class="mb-3">
              <div class="fw-bold">How long does it take?</div>
              <div class="lead-muted">Landing page: 1–3 days. Full site: 3–10 days depending on content.</div>
            </div>

            <div class="mb-3">
              <div class="fw-bold">Do you do hosting?</div>
              <div class="lead-muted">Yes — Azure Static Web Apps + custom domain setup.</div>
            </div>

            <div>
              <div class="fw-bold">Can you add a contact form?</div>
              <div class="lead-muted">
                Yes. (Your SendGrid API will power it once configured.)
              </div>
            </div>

            <div class="mt-4">
              <router-link class="btn btn-primary w-100" to="/contact">Request a quote</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>
