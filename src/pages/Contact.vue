<template>
  <div class="contact-container">
    <h1>Contact MeDan</h1>
    <p class="subtitle">
      Fast response. Send a message and we’ll get back to you soon.
    </p>

    <form @submit.prevent="handleSubmit">
      <div class="form-row">
        <label>Name</label>
        <input
          type="text"
          v-model="name"
          required
          placeholder="Your name"
        />
      </div>

      <div class="form-row">
        <label>Email</label>
        <input
          type="email"
          v-model="email"
          required
          placeholder="your@email.com"
        />
      </div>

      <div class="form-row">
        <label>Message</label>
        <textarea
          v-model="message"
          required
          placeholder="Write your message..."
        ></textarea>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? "Sending..." : "Send Message" }}
      </button>

      <p v-if="success" class="success">
        ✅ Message sent successfully!
      </p>

      <p v-if="error" class="error">
        ❌ Something went wrong. Try again.
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { sendContactEmail } from "../services/email";

const name = ref("");
const email = ref("");
const message = ref("");

const loading = ref(false);
const success = ref(false);
const error = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  success.value = false;
  error.value = false;

  try {
    await sendContactEmail(
      name.value,
      email.value,
      message.value
    );

    success.value = true;
    name.value = "";
    email.value = "";
    message.value = "";
  } catch (err) {
    console.error("EmailJS error:", err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.contact-container {
  max-width: 520px;
  margin: 0 auto;
  padding: 2rem;
}

.subtitle {
  margin-bottom: 1.5rem;
  color: #666;
}

.form-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

label {
  font-weight: 600;
  margin-bottom: 0.3rem;
}

input,
textarea {
  padding: 0.6rem;
  font-size: 1rem;
}

textarea {
  min-height: 120px;
}

button {
  padding: 0.7rem;
  font-size: 1rem;
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  margin-top: 1rem;
  color: green;
}

.error {
  margin-top: 1rem;
  color: red;
}
</style>


