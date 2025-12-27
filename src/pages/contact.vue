<template>
  <div class="page">
    <h1 class="title">Contact Us</h1>
    <p class="subtitle">Send us a message and we’ll reply as soon as possible.</p>

    <form class="card" @submit.prevent="submitForm">
      <label class="label">Name</label>
      <input class="input" v-model.trim="name" type="text" placeholder="Your name" required />

      <label class="label">Email</label>
      <input class="input" v-model.trim="email" type="email" placeholder="you@example.com" required />

      <label class="label">Subject</label>
      <input class="input" v-model.trim="subject" type="text" placeholder="What is this about?" required />

      <label class="label">Message</label>
      <textarea class="input" v-model.trim="message" rows="6" placeholder="Type your message..." required></textarea>

      <!-- simple anti-bot field (hidden) -->
      <input v-model="website" type="text" class="honeypot" autocomplete="off" tabindex="-1" />

      <button class="btn btn-blue" type="submit" :disabled="loading">
        {{ loading ? "Sending..." : "Send Message" }}
      </button>

      <p v-if="success" class="success">✅ Message sent! We’ll get back to you soon.</p>
      <p v-if="error" class="error">❌ {{ error }}</p>

      <router-link to="/" class="btn btn-gray">⬅ Back Home</router-link>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue"

// Put your Formspree endpoint here after you create it
// Example: https://formspree.io/f/abcdwxyz
const FORMSPREE_URL = import.meta.env.VITE_FORMSPREE_URL

const name = ref("")
const email = ref("")
const subject = ref("")
const message = ref("")
const website = ref("") // honeypot

const loading = ref(false)
const success = ref(false)
const error = ref("")

async function submitForm() {
  success.value = false
  error.value = ""

  // bot check
  if (website.value) return

  if (!FORMSPREE_URL) {
    error.value = "Form is not configured yet (missing VITE_FORMSPREE_URL)."
    return
  }

  loading.value = true
  try {
    const res = await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        subject: subject.value,
        message: message.value,
      }),
    })

    if (!res.ok) throw new Error("Submission failed. Please try again.")

    success.value = true
    name.value = ""
    email.value = ""
    subject.value = ""
    message.value = ""
  } catch (e) {
    error.value = e.message || "Something went wrong."
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { text-align: center; padding: 40px 16px; }
.title { font-size: 44px; margin: 0 0 8px; }
.subtitle { margin: 0 0 24px; color: #555; }

.card {
  margin: 0 auto;
  max-width: 560px;
  text-align: left;
  padding: 18px;
  border-radius: 14px;
  background: #fff;
  display: grid;
  gap: 10px;
}

.label { font-weight: 600; margin-top: 8px; }
.input {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  font-size: 16px;
  box-sizing: border-box;
}

.btn {
  width: 100%;
  border: 0;
  padding: 14px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
}
.btn-blue { background: #2563eb; color: white; }
.btn-gray { background: #666; color: white; display: block; }

.success { color: #0a7a2f; font-weight: 700; }
.error { color: #b00020; font-weight: 700; }

.honeypot { display:none; }
</style>
