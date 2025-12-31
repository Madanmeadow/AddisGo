<template>
  <main>
    <!-- TOP HEADER (matches your blue theme) -->
    <section class="page-hero">
      <div class="container py-5">
        <div class="row align-items-end g-3">
          <div class="col-lg-8">
            <h1 class="display-5 fw-bold mb-2">Services</h1>
            <p class="lead mb-0">
              Simple packages, clear pricing, and fast delivery.
            </p>
          </div>

          <div class="col-lg-4 text-lg-end">
            <RouterLink to="/contact" class="btn btn-primary btn-glow btn-hero">
              Get a free plan
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- PACKAGES -->
    <section class="section-soft">
      <div class="container py-5">
        <div class="row g-4">
          <!-- Starter -->
          <div class="col-lg-4">
            <div class="card service-card h-100">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h3 class="h5 fw-bold mb-1">Starter Website</h3>
                    <p class="text-muted mb-3">
                      Perfect for a simple business site or personal brand.
                    </p>
                  </div>
                  <span class="badge rounded-pill bg-primary-subtle text-primary">
                    $499+
                  </span>
                </div>

                <ul class="list-unstyled mb-4">
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> 1–3 pages</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Mobile responsive</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Basic SEO</li>
                  <li class="d-flex gap-2"><span class="check">✓</span> Contact page + form UI</li>
                </ul>

                <RouterLink to="/contact" class="btn btn-outline-primary w-100">
                  Request this package
                </RouterLink>

                <p class="small text-muted mt-3 mb-0">
                  Typical timeline: 1–3 days (depending on content).
                </p>
              </div>
            </div>
          </div>

          <!-- Business -->
          <div class="col-lg-4">
            <div class="card service-card h-100 service-card-featured">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h3 class="h5 fw-bold mb-1">Business Website</h3>
                    <p class="text-muted mb-3">
                      A polished site that builds trust and converts visitors.
                    </p>
                  </div>
                  <span class="badge rounded-pill bg-primary">
                    $899+
                  </span>
                </div>

                <ul class="list-unstyled mb-4">
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Up to 6 pages</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Better design + sections</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Speed optimization</li>
                  <li class="d-flex gap-2"><span class="check">✓</span> Analytics setup (optional)</li>
                </ul>

                <RouterLink to="/contact" class="btn btn-primary btn-glow w-100">
                  Request this package
                </RouterLink>

                <p class="small text-muted mt-3 mb-0">
                  Great for: local businesses, services, small shops.
                </p>
              </div>
            </div>
          </div>

          <!-- Fixes -->
          <div class="col-lg-4">
            <div class="card service-card h-100">
              <div class="card-body p-4">
                <div class="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h3 class="h5 fw-bold mb-1">Fixes & Improvements</h3>
                    <p class="text-muted mb-3">
                      Updates, redesigns, and performance fixes for existing sites.
                    </p>
                  </div>
                  <span class="badge rounded-pill bg-secondary-subtle text-secondary">
                    $75/hr
                  </span>
                </div>

                <ul class="list-unstyled mb-4">
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Bug fixes</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> UI clean-up</li>
                  <li class="d-flex gap-2 mb-2"><span class="check">✓</span> Performance</li>
                  <li class="d-flex gap-2"><span class="check">✓</span> Deployment help</li>
                </ul>

                <RouterLink to="/contact" class="btn btn-outline-primary w-100">
                  Request this package
                </RouterLink>

                <p class="small text-muted mt-3 mb-0">
                  Quick wins: spacing, layout, mobile fixes, speed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- SECONDARY CTA (optional) -->
        <div class="text-center mt-5">
          <p class="mb-2 text-muted">
            Not sure which package fits? Send a message and I’ll recommend the best option.
          </p>
          <RouterLink to="/contact" class="btn btn-primary btn-glow">
            Get a free plan
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- WHAT'S INCLUDED -->
    <section class="bg-white">
      <div class="container py-5">
        <div class="row g-4">
          <div class="col-lg-6">
            <h2 class="h3 fw-bold mb-3">What’s included</h2>
            <p class="text-muted">
              Every build focuses on clean layout, mobile-first design, and a smooth deployment flow.
            </p>

            <div class="row g-3 mt-1">
              <div class="col-md-6">
                <div class="mini-card p-3 h-100">
                  <h3 class="h6 fw-bold mb-1">Mobile-first</h3>
                  <p class="small text-muted mb-0">Looks great on phones, tablets, and desktop.</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mini-card p-3 h-100">
                  <h3 class="h6 fw-bold mb-1">Clean sections</h3>
                  <p class="small text-muted mb-0">Hero, services, about, contact—built to convert.</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mini-card p-3 h-100">
                  <h3 class="h6 fw-bold mb-1">Fast load</h3>
                  <p class="small text-muted mb-0">Optimized layout and assets for speed.</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mini-card p-3 h-100">
                  <h3 class="h6 fw-bold mb-1">Deploy ready</h3>
                  <p class="small text-muted mb-0">CI/CD-ready setup for easy updates.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="card shadow-sm border-0 rounded-4">
              <div class="card-body p-4">
                <h2 class="h5 fw-bold mb-3">Typical process</h2>

                <ol class="text-muted mb-0 ps-3">
                  <li class="mb-2"><strong>Discovery:</strong> what you need + examples you like</li>
                  <li class="mb-2"><strong>Design:</strong> clean layout + sections + spacing</li>
                  <li class="mb-2"><strong>Build:</strong> Vue + Router + Bootstrap</li>
                  <li class="mb-2"><strong>Review:</strong> edits & final polish</li>
                  <li><strong>Deploy:</strong> publish + optional domain setup</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section-soft">
      <div class="container py-5">
        <h2 class="h3 fw-bold text-center mb-4">FAQ</h2>

        <div class="row justify-content-center">
          <div class="col-lg-9">
            <div class="accordion" id="faq">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#q1">
                    Do you provide hosting?
                  </button>
                </h2>
                <div id="q1" class="accordion-collapse collapse show" data-bs-parent="#faq">
                  <div class="accordion-body text-muted">
                    I can deploy to Azure Static Web Apps and connect GitHub for automatic updates.
                    If you already have hosting, I can help set it up too.
                  </div>
                </div>
              </div>

              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#q2">
                    Can you add a real contact form?
                  </button>
                </h2>
                <div id="q2" class="accordion-collapse collapse" data-bs-parent="#faq">
                  <div class="accordion-body text-muted">
                    Yes. We can connect the form to SendGrid/Twilio, Azure Functions, or an API endpoint.
                    For now your UI is ready—next step is email delivery.
                  </div>
                </div>
              </div>

              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#q3">
                    Do you do edits after launch?
                  </button>
                </h2>
                <div id="q3" class="accordion-collapse collapse" data-bs-parent="#faq">
                  <div class="accordion-body text-muted">
                    Yep—small edits, bug fixes, new sections, and improvements are available hourly.
                  </div>
                </div>
              </div>
            </div>

            <p class="text-center text-muted mt-4 mb-0">
              Want a quick recommendation? <RouterLink to="/contact">Send a message</RouterLink>.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA (OFF by default to avoid duplicates with your footer) -->
    <section v-if="showBottomCta" class="bg-white">
      <div class="container py-5">
        <div class="cta-bar p-4 p-md-5">
          <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <h2 class="h4 fw-bold mb-1">Ready to start? Let’s talk.</h2>
              <p class="text-muted mb-0">
                Tell me what you need — I’ll reply with a clear plan and next steps.
              </p>
            </div>
            <RouterLink to="/contact" class="btn btn-primary btn-glow">
              Let’s talk
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from "vue"

// If your global footer already has a CTA, keep this FALSE to prevent doubles.
const showBottomCta = ref(false)
</script>


