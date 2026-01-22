<template>
  <section class="contact">
    <h2>Contact MeDan</h2>

    <form @submit.prevent="sendMessage">
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
  </section>
</template>

<script setup>
import { ref } from 'vue'
import emailjs from '@emailjs/browser'

const name = ref('')
const email = ref('')
const message = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref(false)

const sendMessage = async () => {
  loading.value = true
  success.value = false
  error.value = false

  try {
    await emailjs.send(
      'service_wn78sgc',          // ✅ Service ID
      'template_gxz5kzl',         // ✅ Template ID
      {
        from_name: name.value,   // MUST match template
        reply_to: email.value,   // MUST match template
        message: message.value   // MUST match template
      },
      'tDY5BR8IN9QpXqeBM'          // ✅ Public key
    )

    success.value = true
    name.value = ''
    email.value = ''
    message.value = ''
  } catch (err) {
    console.error('EmailJS error:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}
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
  padding: 10px;
}

button {
  padding: 10px 20px;
}

.success {
  color: green;
}

.error {
  color: red;
}
</style>
