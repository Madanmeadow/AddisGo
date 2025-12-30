<template>
  <section class="py-5">
    <div class="container">
      <h1 class="fw-bold mb-2">Contact</h1>
      <p class="text-muted mb-4">
        Send a message and I’ll reply with next steps (scope + timeline).
      </p>

      <div class="row g-4">
        <div class="col-lg-7">
          <div class="bg-white border rounded-4 p-4 p-md-5">
            <h5 class="fw-bold mb-3">Quick message</h5>

            <!-- UI only for now (API later) -->
            <form @submit.prevent="handleSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Name</label>
                  <input v-model="form.name" class="form-control" placeholder="Your name" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input v-model="form.email" type="email" class="form-control" placeholder="you@email.com" required />
                </div>
                <div class="col-12">
                  <label class="form-label">Subject</label>
                  <input v-model="form.subject" class="form-control" placeholder="Website help / new site / updates..." required />
                </div>
                <div class="col-12">
                  <label class="form-label">Message</label>
                  <textarea v-model="form.message" class="form-control" rows="5" placeholder="Tell me what you need..." required></textarea>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mt-3">
                <button class="btn btn-primary" type="submit">Send message</button>
                <button class="btn btn-outline-secondary" type="button" @click="reset">Clear</button>
              </div>

              <div v-if="status" class="alert alert-info mt-3 mb-0">
                {{ status }}
              </div>
            </form>

            <p class="text-muted small mt-3 mb-0">
              Note: This form is UI-only right now. We’ll re-connect it to the API once SendGrid is ready.
            </p>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card card-hover rounded-4">
            <div class="card-body p-4">
              <h5 class="fw-bold">What to include</h5>
              <ul class="text-muted mb-0">
                <li>What your website is for</li>
                <li>Any examples you like (links)</li>
                <li>Pages you want (Home/About/Services/Contact)</li>
                <li>Deadline (if any)</li>
              </ul>
            </div>
          </div>

          <div class="card card-hover rounded-4 mt-3">
            <div class="card-body p-4">
              <h5 class="fw-bold">Response time</h5>
              <p class="text-muted mb-0">
                Usually same day or within 24 hours.
              </p>
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

const status = ref("")

function handleSubmit() {
  status.value = "✅ Message captured (UI only). Next step: reconnect to /api/contact once email service is working."
}

function reset() {
  form.name = ""
  form.email = ""
  form.subject = ""
  form.message = ""
  status.value = ""
}
</script>
