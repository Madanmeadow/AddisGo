<template>
  <div class="contact">
    <h2>Contact MeDan</h2>

    <form @submit.prevent="handleSubmit">
      <input
        v-model="name"
        type="text"
        placeholder="Your name"
        required
      />

      <input
        v-model="email"
        type="email"
        placeholder="Your email"
        required
      />

      <textarea
        v-model="message"
        placeholder="Your message"
        required
      ></textarea>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Message' }}
      </button>
    </form>

    <p v-if="success" class="success">✅ Message sent successfully!</p>
    <p v-if="error" class="error">❌ Failed to send message. Check console.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { sendContactEmail } from '../services/email';

const name = ref('');
const email = ref('');
const message = ref('');
const loading = ref(false);
const success = ref(false);
const error = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  success.value = false;
  error.value = false;

  try {
    await sendContactEmail({
      name: name.value,
      email: email.value,
      message: message.value,
    });

    success.value = true;
    name.value = '';
    email.value = '';
    message.value = '';
  } catch (err) {
    console.error('EmailJS error:', err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.contact {
  max-width: 500px;
  margin: auto;
}
input,
textarea {
  width: 100%;
  margin-bottom: 10px;
}
.success {
  color: green;
}
.error {
  color: red;
}
</style>
