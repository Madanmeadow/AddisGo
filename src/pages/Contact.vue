<template>
  <div class="card">
    <h1 style="margin-top:0;">Contact</h1>

    <form @submit.prevent="submit">
      <label>Name</label>
      <input v-model.trim="name" required />

      <label>Email</label>
      <input v-model.trim="email" type="email" required />

      <label>Message</label>
      <textarea v-model.trim="message" required></textarea>

      <button class="primary" type="submit" :disabled="loading">
        {{ loading ? "Sending..." : "Send Message" }}
      </button>

      <div v-if="success" class="success">Message sent successfully ✅</div>
      <div v-if="error" style="margin-top:10px; color:#b91c1c; font-weight:700;">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue"

const name = ref("")
const email = ref("")
const message = ref("")
const loading = ref(false)
const success = ref(false)
const error = ref("")

async function submit() {
  success.value = false
  error.value = ""
  loading.value = true

  try {
    // If your API endpoint is different, tell me what it is and I’ll match it.
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value,
      }),
    })

    if (!res.ok) throw new Error("Failed to send message")

    success.value = true
    name.value = ""
    email.value = ""
    message.value = ""
  } catch (e) {
    error.value = e?.message || "Something went wrong"
  } finally {
    loading.value = false
  }
}
</script>
