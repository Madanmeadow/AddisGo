<script setup>
import { ref } from "vue"

const name = ref("")
const email = ref("")
const message = ref("")

const statusMsg = ref("")
const isError = ref(false)
const isSending = ref(false)

async function sendMessage() {
  statusMsg.value = ""
  isError.value = false
  isSending.value = true

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

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data?.message || "Network error sending message.")
    }

    statusMsg.value = "Message sent successfully ✅"
    name.value = ""
    email.value = ""
    message.value = ""
  } catch (err) {
    isError.value = true
    statusMsg.value = err.message || "Network error sending message."
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <form class="card" @submit.prevent="sendMessage">
    <label>
      Name
      <input v-model="name" required />
    </label>

    <label>
      Email
      <input v-model="email" type="email" required />
    </label>

    <label>
      Message
      <textarea v-model="message" rows="5" required />
    </label>

    <button type="submit" :disabled="isSending">
      {{ isSending ? "Sending..." : "Send Message" }}
    </button>

    <p v-if="statusMsg" :class="isError ? 'err' : 'ok'">{{ statusMsg }}</p>
  </form>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 18px;
  background: white;
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font: inherit;
}

button {
  width: fit-content;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #0a56c2;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ok {
  color: #0a7a2f;
  margin: 6px 0 0;
}

.err {
  color: #b00020;
  margin: 6px 0 0;
}
</style>

