<template>
  <!-- HERO -->
  <section class="contact-hero">
    <div class="container py-5">
      <h1 class="display-5 fw-bold text-white mb-2">Contact</h1>
      <p class="lead text-white-50 mb-0">
        Tell me what you need — I’ll reply with a clear plan and next steps.
      </p>
    </div>
  </section>

  <!-- CONTENT -->
  <section class="section-soft">
    <div class="container py-5">
      <div class="row g-4 align-items-stretch">

        <!-- FORM -->
        <div class="col-lg-7">
          <div class="card soft-card h-100">
            <div class="card-body p-4 p-lg-5">
              <h2 class="h4 mb-1">Send a message</h2>
              <p class="text-muted mb-4">
                I usually respond within 24 hours.
              </p>

              <!-- STATUS -->
              <div v-if="status.message" class="mb-3">
                <div
                  :class="[
                    'alert',
                    status.type === 'success' ? 'alert-success' : 'alert-danger'
                  ]"
                >
                  {{ status.message }}
                </div>
              </div>

              <form @submit.prevent="handleSubmit" novalidate>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Name</label>
                    <input
                      v-model.trim="form.name"
                      type="text"
                      class="form-control"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input
                      v-model.trim="form.email"
                      type="email"
                      class="form-control"
                      placeholder="meadowmadan@gmail.com"
                      required
                    />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Subject</label>
                    <input
                      v-model.trim="form.subject"
                      type="text"
                      class="form-control"
                      placeholder="Website, redesign, fixes, etc."
                    />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Message</label>
                    <textarea
                      v-model.trim="form.message"
                      class="form-control"
                      rows="6"
                      placeholder="Tell me what you want built, pages you need, examples you like, and your deadline."
                      required
                    ></textarea>
                  </div>

                  <div class="col-12 d-flex gap-2 mt-2">
                    <button
                      type="submit"
                      class="btn btn-primary btn-glow"
                      :disabled="isSending"
                    >
                      {{ isSending ? "Sending..." : "Send message" }}
                    </button>

                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="reset"
                      :disabled="isSending"
                    >
                      Clear
                    </button>
                  </div>

                  <div class="col-12">
                    <small class="text-muted">
                      (Form is ready — email sending can be connected next.)
                    </small>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- CONTACT DETAILS -->
        <div class="col-lg-5">
          <div class="card soft-card h-100">
            <div class="card-body p-4 p-lg-5">
              <h2 class="h5 mb-3">Prefer to talk?</h2>

              <!-- PHONE -->
              <div class="mb-4">
                <div class="fs-4 fw-semibold">
                  📞
                  <a class="contact-link" href="tel:+16512637198">
                    (651) 2637198
                  </a>
                </div>
                <div class="text-muted small">
                  Text or call — I usually respond within 24 hours.
                </div>
                <div class="text-muted small">
                  Business hours: Mon–Fri, 9am–6pm
                </div>
              </div>

              <!-- WHAT TO INCLUDE -->
              <div class="mb-4">
                <div class="fw-semibold mb-2">What to include</div>
                <ul class="text-muted mb-0">
                  <li>Business name & goal</li>
                  <li>Pages you want (Home/About/Services/Contact)</li>
                  <li>Any example sites you like</li>
                  <li>Timeline or deadline (if any)</li>
                </ul>
              </div>

              <!-- TURNAROUND -->
              <div class="mb-4">
                <div class="fw-semibold mb-1">Typical turnaround</div>
                <div class="text-muted">
                  1–3 days for small sites, depending on content and feedback speed.
                </div>
              </div>

              <!-- DEPLOY NOTE -->
              <div class="callout">
                <div class="fw-semibold mb-1">Deployment included</div>
                <div class="text-muted mb-0">
                  GitHub → Azure Static Web Apps with automatic updates.
                </div>
              </div>

              <div class="mt-4 small text-muted">
                Or email:
                <a class="contact-link" href="mailto:you@example.com">
                  you@example.com
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue"

const form = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
})

const isSending = ref(false)
const status = reactive({
  type: "",
  message: "",
})

function validate() {
  if (!form.name || !form.email || !form.message) {
    status.type = "error"
    status.message = "Please fill in Name, Email, and Message."
    return false
  }
  if (!form.email.includes("@")) {
    status.type = "error"
    status.message = "Please enter a valid email address."
    return false
  }
  return true
}

async function handleSubmit() {
  status.message = ""
  if (!validate()) return

  isSending.value = true

  try {
    // UI-only for now (safe)
    await new Promise((r) => setTimeout(r, 600))

    status.type = "success"
    status.message = "Message received! I’ll get back to you within 24 hours."
    reset()
  } catch {
    status.type = "error"
    status.message = "Something went wrong. Please call or text instead."
  } finally {
    isSending.value = false
  }
}

function reset() {
  form.name = ""
  form.email = ""
  form.subject = ""
  form.message = ""
}
</script>

<style scoped>
.contact-hero {
  background: radial-gradient(
      1200px 500px at 10% 20%,
      rgba(255, 255, 255, 0.18),
      transparent 60%
    ),
    linear-gradient(135deg, #0b3b7a, #0a6fb5);
}

.section-soft {
  background: #f6f8fb;
}

.soft-card {
  border: 0;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(10, 20, 40, 0.08);
}

.btn-glow {
  box-shadow: 0 10px 22px rgba(13, 110, 253, 0.25);
}

.contact-link {
  text-decoration: none;
  font-weight: 600;
}

.callout {
  background: rgba(13, 110, 253, 0.08);
  padding: 14px;
  border-radius: 14px;
}
</style>
