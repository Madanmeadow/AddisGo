<template>
  <section class="page-hero">
    <div class="container">
      <h1 class="mb-2">Contact</h1>
      <p class="lead mb-0">
        Tell me what you need — I’ll reply with a clear plan and next steps.
      </p>
    </div>
  </section>

  <section class="section-soft">
    <div class="container py-5">
      <div class="row g-4">
        <!-- FORM -->
        <div class="col-lg-7">
          <div class="card soft-card">
            <div class="card-body p-4">
              <h3 class="mb-1">Send a message</h3>
              <p class="text-muted mb-4">
                I usually respond within 24 hours.
              </p>

              <form @submit.prevent="handleSubmit">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Name</label>
                    <input v-model="form.name" class="form-control" required />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input v-model="form.email" type="email" class="form-control" required />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Subject</label>
                    <input v-model="form.subject" class="form-control" required />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Message</label>
                    <textarea v-model="form.message" rows="5" class="form-control" required></textarea>
                  </div>

                  <div class="col-12 d-flex gap-2 flex-wrap">
                    <button class="btn btn-primary btn-lg" type="submit" :disabled="loading">
                      {{ loading ? "Sending..." : "Send message" }}
                    </button>

                    <button class="btn btn-outline-secondary btn-lg" type="button" @click="reset" :disabled="loading">
                      Clear
                    </button>
                  </div>

                  <div v-if="status.message" class="col-12">
                    <div :class="['alert', status.type === 'success' ? 'alert-success' : 'alert-danger']" class="mb-0">
                      {{ status.message }}
                    </div>
                  </div>

                  <p class="text-muted small mb-0">
                    (Email sending can be connected later — for now the form UI is ready.)
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- DETAILS -->
        <div class="col-lg-5">
          <div class="card soft-card h-100">
            <div class="card-body p-4">
              <h3 class="mb-3">Details</h3>

              <div class="mb-3">
                <div class="fw-semibold">What to include</div>
                <ul class="mb-0">
                  <li>Business name & goal</li>
                  <li>Pages you want (Home/About/Services)</li>
                  <li>Any examples you like</li>
                  <li>Deadline (if any)</li>
                </ul>
              </div>

              <hr />

              <div class="mb-3">
                <div class="fw-semibold">Typical turnaround</div>
                <div class="text-muted">1–3 days for small sites, depending on content.</div>
              </div>

              <div class="callout">
                <div class="fw-semibold">Want it deployed on Azure?</div>
                <div class="text-muted mb-0">
                  I can connect GitHub → Azure Static Web Apps so updates deploy automatically.
                </div>
              </div>

              <div class="mt-4 small text-muted">
                © 2025 AddisGo
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

const loading = ref(false)
const status = reactive({ type: "success", message: "" })

async function handleSubmit() {
  // For now: just show success UI (we’ll connect /api/contact later)
  loading.value = true
  status.message = ""

  try {
    // Later you can replace this with:
    // await fetch("/api/contact", { method:"POST", headers:{...}, body: JSON.stringify(form) })

    await new Promise((r) => setTimeout(r, 600))

    status.type = "success"
    status.message = "✅ Message captured! (Email sending will be connected later.)"
    reset()
  } catch (e) {
    status.type = "error"
    status.message = "❌ Something went wrong. Try again."
  } finally {
    loading.value = false
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
.page-hero {
  background: linear-gradient(180deg, #0b1f3a 0%, #123a67 100%);
  color: #fff;
  padding: 3.5rem 0;
}

.section-soft {
  background: #f5f7fb;
}

.soft-card {
  border: 0;
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
}

.callout {
  background: rgba(77, 171, 247, 0.12);
  border-radius: 12px;
  padding: 1rem;
}
</style>
