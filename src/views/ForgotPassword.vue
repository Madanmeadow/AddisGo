<script setup>
import { ref } from "vue";

const email = ref("");
const message = ref("");
const error = ref("");
const loading = ref(false);

async function sendReset() {
  if (!email.value) {
    error.value = "Please enter your email address";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    // Backend always sends this, even if email doesn't exist (security)
    message.value = data.message || "If this email exists, a reset link has been sent.";
    email.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <h1>⚡ Reset Password</h1>
    <p>Enter your email and we'll send you a reset link.</p>

    <input v-model="email" type="email" placeholder="Email" />

    <button @click="sendReset" :disabled="loading">
      {{ loading ? "Sending..." : "Send Reset Link" }}
    </button>

    <p class="error" v-if="error">{{ error }}</p>
    <p class="success" v-if="message">{{ message }}</p>

    <router-link to="/login">← Back to Login</router-link>
  </div>
</template>

<style scoped>
.auth {
  max-width: 400px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
input {
  padding: 12px;
  border-radius: 6px;
}
button {
  padding: 12px;
  background: crimson;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: red;
}
.success {
  color: green;
}
</style>