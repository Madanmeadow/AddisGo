<template>
  <form class="card" @submit.prevent="send">
    <label>Name</label>
    <input v-model="name" required />

    <label>Email</label>
    <input v-model="email" type="email" required />

    <label>Message</label>
    <textarea v-model="message" rows="5" required />

    <button :disabled="loading">
      {{ loading ? "Sending..." : "Send Message" }}
    </button>

    <p v-if="success" class="ok">{{ success }}</p>
    <p v-if="error" class="err">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from "vue"

const name = ref("")
const email = ref("")
const message = ref("")
const loading = ref(false)
const success = ref("")
const error = ref("")

async function send() {
  loading.value = true
  success.value = ""
  error.value = ""

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value,
      }),
    })

    const data = await res.json()

    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "Failed to send")
    }

    success.value = "Message sent successfully!"
    name.value = ""
    email.value = ""
    message.value = ""
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card {
  background: #fff;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #ddd;
}
label {
  display: block;
  margin-top: 12px;
  font-weight: 600;
}
input, textarea {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  border-radius: 8px;
  border: 1px solid #ccc;
}
button {
  margin-top: 14px;
  padding: 10px;
}
.ok { color: green; margin-top: 10px; }
.err { color: red; margin-top: 10px; }
</style>
