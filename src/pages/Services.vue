<><template>
  <section class="py-5">
    <div class="container">
      <h1 class="fw-bold mb-2">Services</h1>
      <p class="text-muted mb-4">
        Pick what you need — or tell me your goal and I’ll recommend the best option.
      </p>

      <div class="row g-3 g-md-4">
        <div class="col-md-6 col-lg-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Landing Page</h5>
              <p class="text-muted">
                One-page site to promote a service, product, or event.
              </p>
              <ul class="text-muted mb-0">
                <li>Hero + CTA</li>
                <li>Services highlights</li>
                <li>Contact section</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Business Website</h5>
              <p class="text-muted">
                Multi-page site with routing (Home / About / Services / Contact).
              </p>
              <ul class="text-muted mb-0">
                <li>Professional layout</li>
                <li>Clean navigation</li>
                <li>Mobile responsive</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Fixes & Updates</h5>
              <p class="text-muted">
                Improve an existing website without rebuilding everything.
              </p>
              <ul class="text-muted mb-0">
                <li>Bug fixes</li>
                <li>Design cleanup</li>
                <li>Performance & spacing</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Deploy + Domain</h5>
              <p class="text-muted">
                Get your site online with Azure Static Web Apps and a custom domain.
              </p>
              <ul class="text-muted mb-0">
                <li>CI/CD from GitHub</li>
                <li>Custom domain setup</li>
                <li>HTTPS enabled</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="card card-hover rounded-4 h-100">
            <div class="card-body p-4">
              <h5 class="fw-bold">Simple Forms</h5>
              <p class="text-muted">
                Contact form UI + basic validation (API wiring can be added later).
              </p>
              <ul class="text-muted mb-0">
                <li>Clean form layout</li>
                <li>Validation messages</li>
                <li>Success state UI</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      <div class="mt-5 p-4 bg-white border rounded-4">
        <h4 class="fw-bold mb-2">Not sure what to pick?</h4>
        <p class="text-muted mb-3">
          Tell me: what’s your business/service, and what do you want visitors to do?
        </p>
        <RouterLink class="btn btn-primary" to="/contact">Message me</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

