<template>
  <main>
    <!-- Header -->
    <section class="page-hero">
      <div class="container py-5">
        <h1 class="fw-bold mb-2">Contact</h1>
        <p class="text-white-50 mb-0">
          Call, text, email, or send a message — I’ll reply with a clear plan.
        </p>
      </div>
    </section>

    <section class="bg-white" ref="observeRoot">
      <div class="container py-5">
        <div class="row g-4">
          <!-- Form -->
          <div class="col-lg-7">
            <div class="card p-4 reveal">
              <h2 class="h5 fw-bold mb-3">Send a message</h2>

              <form @submit.prevent="submitForm">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Name</label>
                    <input v-model.trim="form.name" class="form-control" type="text" placeholder="Your name" required />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input v-model.trim="form.email" class="form-control" type="email" placeholder="you@email.com" required />
                  </div>

                  <div class="col-md-12">
                    <label class="form-label">Phone (optional)</label>
                    <input v-model.trim="form.phone" class="form-control" type="tel" placeholder="651-263-7198" />
                  </div>

                  <div class="col-md-12">
                    <label class="form-label">Subject</label>
                    <input v-model.trim="form.subject" class="form-control" type="text" placeholder="What do you need help with?" required />
                  </div>

                  <div class="col-md-12">
                    <label class="form-label">Message</label>
                    <textarea
                      v-model.trim="form.message"
                      class="form-control"
                      rows="6"
                      placeholder="Tell me about your project, timeline, and any links you have."
                      required
                    ></textarea>
                  </div>
                </div>

                <div class="d-flex gap-2 mt-4 flex-wrap">
                  <button class="btn btn-primary btn-glow" type="submit" :disabled="loading">
                    {{ loading ? "Sending..." : "Send message" }}
                  </button>

                  <button class="btn btn-outline-secondary" type="button" @click="resetForm" :disabled="loading">
                    Clear
                  </button>
                </div>

                <div v-if="status.message" class="mt-3 alert" :class="status.ok ? 'alert-success' : 'alert-danger'">
                  {{ status.message }}
                </div>

                <div class="small text-muted mt-2">
                  (Email/SMS auto-reply can be connected — this form is ready.)
                </div>
              </form>
            </div>
          </div>

          <!-- Contact options -->
          <div class="col-lg-5">
            <div class="card p-4 reveal">
              <h2 class="h5 fw-bold mb-3">Quick contact</h2>

              <div class="d-grid gap-2">
                <a class="btn btn-outline-primary" :href="telLink">
                  📞 Call: {{ displayPhone }}
                </a>

                <a class="btn btn-outline-primary" :href="smsLink">
                  💬 Text: {{ displayPhone }}
                </a>

                <a class="btn btn-outline-primary" :href="emailLink">
                  ✉️ Email: {{ email }}
                </a>
              </div>

              <hr class="my-4" />

              <h3 class="h6 fw-bold mb-2">Typical turnaround</h3>
              <p class="text-muted mb-3">
                1–3 days for small sites, depending on content and scope.
              </p>

              <div class="tip-box p-3">
                <div class="fw-bold mb-1">Want it deployed on Azure?</div>
                <div class="small text-muted">
                  I can connect GitHub → Azure Static Web Apps so updates deploy automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="cta-strip">
      <div class="container py-4">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h3 class="h5 fw-bold mb-1">Ready to start? Let’s talk.</h3>
            <div class="text-muted">Call/text or send the form — whichever is easiest.</div>
          </div>

          <div class="d-flex gap-2 flex-wrap">
            <a class="btn btn-primary btn-glow" :href="smsLink">Text me</a>
            <a class="btn btn-outline-primary" :href="telLink">Call me</a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue"

const phone = "6512637198"
const displayPhone = "651-263-7198"
const email = "madanmeadow@gmail.com"

const telLink = computed(() => `tel:+1${phone}`)
const smsLink = computed(() => `sms:+1${phone}`)
const emailLink = computed(() => `mailto:${email}?subject=${encodeURIComponent("Website project inquiry")}`)

const form = reactive({
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: ""
})

const loading = ref(false)
const status = reactive({ ok: true, message: "" })

function resetForm() {
  form.name = ""
  form.email = ""
  form.phone = ""
  form.subject = ""
  form.message = ""
  status.message = ""
}

// UI-only submit (you’ll connect API next)
async function submitForm() {
  loading.value = true
  status.message = ""

  try {
    // If you later connect backend:
    // await fetch("/api/contact", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) })

    await new Promise((r) => setTimeout(r, 500))

    status.ok = true
    status.message = "✅ Message received! I’ll reply as soon as possible."
    resetForm()
  } catch (err) {
    status.ok = false
    status.message = "❌ Something went wrong. Please text or email me."
  } finally {
    loading.value = false
  }
}

/* Fade-in on scroll */
const observeRoot = ref(null)
let observer

onMounted(() => {
  const items = document.querySelectorAll(".reveal")

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("reveal-show")
      })
    },
    { threshold: 0.15 }
  )

  items.forEach((el) => observer.observe(el))
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.page-hero {
  background: linear-gradient(135deg, #0b2a4a, #1b4f9a);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.card {
  border: 1px solid #eef2f6;
}

.btn-glow {
  box-shadow: 0 10px 28px rgba(0, 140, 255, 0.22);
}

.tip-box {
  border: 1px solid #e7eef7;
  background: #f6f9ff;
  border-radius: 10px;
}

/* Fade-in animation */
.reveal {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 500ms ease, transform 500ms ease;
}

.reveal-show {
  opacity: 1;
  transform: translateY(0);
}

.cta-strip {
  background: #f6f8fb;
  border-top: 1px solid #eef2f6;
}
</style>
