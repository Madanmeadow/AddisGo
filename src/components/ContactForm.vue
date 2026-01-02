<script setup>
import { ref } from "vue"

const name = ref("")
const email = ref("")
const message = ref("")

const loading = ref(false)
const status = ref("")        // success message
const error = ref("")         // error message

async function submitForm() {
  status.value = ""
  error.value = ""

  if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
    error.value = "Please fill out all fields."
    return
  }

  loading.value = true
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value
      })
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      error.value = data?.message || "Network error sending message."
      return
    }

    status.value = "✅ Message sent successfully!"
    name.value = ""
    email.value = ""
    message.value = ""
  } catch (e) {
    error.value = "Network error sending message."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="card" @submit.prevent="submitForm">
    <label>Name</label>
    <input v-model="name" type="text" placeholder="Your name" />

    <label>Email</label>
    <input v-model="email" type="email" placeholder="you@email.com" />

    <label>Message</label>
    <textarea v-model="message" rows="5" placeholder="Write your message..."></textarea>

    <button :disabled="loading" type="submit">
      {{ loading ? "Sending..." : "Send Message" }}
    </button>

    <p v-if="status" class="ok">{{ status }}</p>
    <p v-if="error" class="bad">❌ {{ error }}</p>
  </form>
</template>

<style scoped>
.card {
  margin-top: 18px;
  border: 1px solid #e3e5ee;
  padding: 18px;
  border-radius: 10px;
  background: #fff;
}

label {
  display: block;
  font-weight: 700;
  margin: 12px 0 6px;
}

input, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #cfd5e6;
  border-radius: 8px;
  font-size: 14px;
}

button {
  margin-top: 14px;
  background: #1f5bd8;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ok { margin-top: 12px; color: #0b7a2c; font-weight: 700; }
.bad { margin-top: 12px; color: #b00020; font-weight: 700; }
</style>
