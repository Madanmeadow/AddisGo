<template>
  <div class="page">
    <div class="card">
      <h1>Contact MeDan</h1>
      <p class="sub">
        Fast response. Send a message and we’ll get back to you soon.
      </p>

      <form @submit.prevent="handleSubmit" class="form">
        <!-- Honeypot anti-spam (hidden) -->
        <input
          v-model="botField"
          type="text"
          class="honeypot"
          tabindex="-1"
          autocomplete="off"
        />

        <div class="row">
          <div class="field">
            <label>Name</label>
            <input v-model.trim="name" type="text" placeholder="Your name" required />
          </div>

          <div class="field">
            <label>Email</label>
            <input v-model.trim="email" type="email" placeholder="you@email.com" required />
          </div>
        </div>

        <div class="field">
          <label>Message</label>
          <textarea
            v-model.trim="message"
            rows="5"
            placeholder="Tell us what you need..."
            required
          ></textarea>
        </div>

        <button class="btn" type="submit" :disabled="loading">
          <span v-if="loading">Sending...</span>
          <span v-else>Send Message</span>
        </button>

        <p v-if="success" class="success">✅ Message sent! Check your inbox.</p>
        <p v-if="error" class="error">❌ {{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { sendContactEmail } from "../services/email"

const name = ref("")
const email = ref("")
const message = ref("")
const botField = ref("") // honeypot

const loading = ref(false)
const success = ref(false)
const error = ref("")

async function handleSubmit() {
  success.value = false
  error.value = ""

  // If bot filled hidden field, silently stop
  if (botField.value) return

  loading.value = true
  try {
    await sendContactEmail({
      name: name.value,
      email: email.value,
      message: message.value,
    })

    success.value = true
    name.value = ""
    email.value = ""
    message.value = ""
  } catch (err) {
    error.value = err?.message || "Something went wrong. Try again."
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  padding: 40px 16px;
  display: flex;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 900px;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
}

h1 {
  margin: 0 0 6px 0;
  font-size: 34px;
}

.sub {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
}

.form {
  margin-top: 12px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 700px) {
  .row {
    grid-template-columns: 1fr;
  }
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
}

.field input,
.field textarea {
  width: 100%;
  padding: 12px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.2);
  outline: none;
  font-size: 16px;
}

.btn {
  margin-top: 14px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: #1f63d3;
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.success {
  margin-top: 10px;
  color: #0a7a2f;
  font-weight: 600;
}

.error {
  margin-top: 10px;
  color: #b00020;
  font-weight: 600;
}

/* hidden anti-spam field */
.honeypot {
  position: absolute;
  left: -9999px;
  opacity: 0;
}
</style>
