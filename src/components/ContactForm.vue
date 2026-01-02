<template>
  <div class="card">
    <h2>Contact</h2>

    <label>Name</label>
    <input v-model="name" placeholder="Your name" />

    <label>Email</label>
    <input v-model="email" placeholder="you@email.com" />

    <label>Message</label>
    <textarea v-model="message" rows="5" placeholder="Write your message..."></textarea>

    <div style="margin-top:12px;">
      <button class="btn" :disabled="loading" @click="send">
        {{ loading ? "Sending..." : "Send Message" }}
      </button>
    </div>

    <p v-if="status" style="margin-top:12px;">{{ status }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";

const name = ref("");
const email = ref("");
const message = ref("");
const loading = ref(false);
const status = ref("");

async function send() {
  status.value = "";
  loading.value = true;

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = data?.message || "Failed to send.";
      return;
    }

    status.value = "✅ Message sent!";
    name.value = "";
    email.value = "";
    message.value = "";
  } catch (err) {
    console.error(err);
    status.value = "❌ Network error sending message.";
  } finally {
    loading.value = false;
  }
}
</script>
