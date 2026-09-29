```vue
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
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.value,
        }),
      }
    );

    // Safely handle JSON or HTML/text responses
    const contentType = res.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();

      throw new Error(
        `Server returned ${res.status}: ${text}`
      );
    }

    // Handle backend errors
    if (!res.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Something went wrong"
      );
    }

    // Success
    message.value =
      data.message ||
      "If this email exists, a reset link has been sent.";

    email.value = "";
  } catch (err) {
    console.error("Forgot password error:", err);

    error.value =
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <h1>⚡ Reset Password</h1>

    <p>
      Enter your email and we'll send you a reset link.
    </p>

    <input
      v-model="email"
      type="email"
      placeholder="Email"
      autocomplete="email"
      @keyup.enter="sendReset"
    />

    <button
      @click="sendReset"
      :disabled="loading"
    >
      {{ loading ? "Sending..." : "Send Reset Link" }}
    </button>

    <p
      class="error"
      v-if="error"
    >
      {{ error }}
    </p>

    <p
      class="success"
      v-if="message"
    >
      {{ message }}
    </p>

    <router-link to="/login">
      ← Back to Login
    </router-link>
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
  border: 1px solid #ccc;
  font-size: 16px;
}

button {
  padding: 12px;
  background: crimson;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: red;
  word-break: break-word;
}

.success {
  color: green;
  word-break: break-word;
}

a {
  color: #c77dff;
  text-align: center;
}
</style>
```

.
