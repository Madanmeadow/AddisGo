<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const token = ref("");
const password = ref("");
const confirm = ref("");
const message = ref("");
const error = ref("");
const loading = ref(false);

onMounted(() => {
  token.value = route.query.token || "";
  if (!token.value) {
    error.value = "Invalid reset link. Please request a new one.";
  }
});

async function resetPassword() {
  if (!password.value || !confirm.value) {
    error.value = "Please fill in both fields";
    return;
  }
  if (password.value.length < 6) {
    error.value = "Password must be at least 6 characters";
    return;
  }
  if (password.value !== confirm.value) {
    error.value = "Passwords don't match";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.value, password: password.value }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    message.value = data.message || "Password updated!";
    setTimeout(() => router.push("/login"), 2000);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <h1>⚡ New Password</h1>
    <p>Enter your new password below.</p>

    <input v-model="password" type="password" placeholder="New password (min 6 characters)" />
    <input v-model="confirm" type="password" placeholder="Confirm new password" />

    <button @click="resetPassword" :disabled="loading || !token">
      {{ loading ? "Updating..." : "Reset Password" }}
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