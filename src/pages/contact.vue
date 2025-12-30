<template>
  <section class="container py-5">
    <div class="mb-4">
      <h1 class="section-title">Contact</h1>
      <p class="lead lead-muted mb-0">
        Tell me what you need. I’ll respond with a simple plan and next steps.
      </p>
    </div>

    <div class="row g-4">
      <!-- Form -->
      <div class="col-lg-7">
        <div class="card card-hover">
          <div class="card-body p-4">
            <h4 class="mb-3">Send a message</h4>

            <div v-if="status.type" class="alert" :class="statusClass" role="alert">
              {{ status.message }}
            </div>

            <form @submit.prevent="submitForm">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Name</label>
                  <input v-model.trim="form.name" class="form-control" placeholder="Your name" />
                  <div v-if="errors.name" class="text-danger small mt-1">{{ errors.name }}</div>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input v-model.trim="form.email" class="form-control" placeholder="you@example.com" />
                  <div v-if="errors.email" class="text-danger small mt-1">{{ errors.email }}</div>
                </div>

                <div class="col-12">
                  <label class="form-label">Subject</label>
                  <input v-model.trim="form.subject" class="form-control" placeholder="What is this about?" />
                  <div v-if="errors.subject" class="text-danger small mt-1">{{ errors.subject }}</div>
                </div>

                <div class="col-12">
                  <label class="form-label">Message</label>
                  <textarea
                    v-model.trim="form.message"
                    class="form-control"
                    rows="6"
                    placeholder="Describe what you want (pages, style, deadline, budget, etc.)"
                  ></textarea>
                  <div v-if="errors.message" class="text-danger small mt-1">{{ errors.message }}</div>
                </div>

                <div class="col-12 d-flex flex-wrap gap-2">
                  <button class="btn btn-primary px-4" type="submit" :disabled="loading">
                    {{ loading ? "Sending..." : "Send message" }}
                  </button>
                  <button class="btn btn-outline-light px-4" type="button" @click="resetForm" :disabled="loading">
                    Clear
                  </button>
                </div>

                <div class="col-12 small" style="color: rgba(233,238,252,0.65);">
                  Note: The form will try <code>/api/contact</code>. If your email service isn’t configured yet,
                  you may see an error — the UI still works.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Contact info -->
      <div class="col-lg-5">
        <div class="section-soft p-4 h-100">
          <h4 class="section-title mb-3">What to include</h4>
          <ul class="lead-muted">
            <li>What type of website you need</li>
            <li>Pages (Home, About, Services, Contact, etc.)</li>
            <li>Any examples you like</li>
            <li>Timeline / deadline</li>
          </ul>

          <hr style="border-color: rgba(255,255,255,0.12);" />

          <h5 class="section-title mb-2">Quick options</h5>
          <div class="row g-3">
            <div class="col-12">
              <div class="card card-hover">
                <div class="card-body p-3">
                  <div class="fw-bold">Basic Site</div>
                  <div class="text-muted">Home + About + Services + Contact</div>
                </div>
              </div>
            </div>

            <div class="col-12">
              <div class="card card-hover">
                <div class="card-body p-3">
                  <div class="fw-bold">Landing Page</div>
                  <div class="text-muted">One page + strong CTA</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 small" style="color: rgba(233,238,252,0.65);">
            Built with <span class="brand-gradient">AddisGo</span> style: clean, modern, and mobile-first.
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue"

const form = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
})

const errors = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
})

const loading = ref(false)
const status = reactive({
  type: "", // "success" | "error"
  message: "",
})

const statusClass = computed(() => {
  return status.type === "success" ? "alert-success" : "alert-danger"
})

function validate() {
  errors.name = ""
  errors.email = ""
  errors.subject = ""
  errors.message = ""

  let ok = true

  if (!form.name || form.name.length < 2) {
    errors.name = "Please enter your name."
    ok = false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email || !emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email."
    ok = false
  }

  if (!form.subject || form.subject.length < 2) {
    errors.subject = "Please enter a subject."
    ok = false
  }

  if (!form.message || form.message.length < 10) {
    errors.message = "Please write a message (at least 10 characters)."
    ok = false
  }

  return ok
}

function resetForm() {
  form.name = ""
  form.email = ""
  form.subject = ""
  form.message = ""

  status.type = ""
  status.message = ""

  errors.name = ""
  errors.email = ""
  errors.subject = ""
  errors.message = ""
}

async function submitForm() {
  status.type = ""
  status.message = ""

  if (!validate()) return

  loading.value = true
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      }),
    })

    // Try to read JSON (may fail if server returns HTML)
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        `Server error (${res.status}). If email service is not configured yet, this is expected.`
      throw new Error(msg)
    }

    status.type = "success"
    status.message = (data && data.message) || "Message sent successfully!"
    resetForm()
    // keep success message after reset:
    status.type = "success"
    status.message = "Message sent successfully!"
  } catch (err) {
    status.type = "error"
    status.message = err?.message || "Something went wrong."
  } finally {
    loading.value = false
  }
}
</script>
