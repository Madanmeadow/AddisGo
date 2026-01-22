<script setup>
import { ref } from 'vue'
import emailjs from '@emailjs/browser'

const name = ref('')
const email = ref('')
const message = ref('')
const status = ref('')
const loading = ref(false)

// IMPORTANT: initialize EmailJS ONCE
emailjs.init('tDY5BR8IN9QpXqeBM') // your PUBLIC KEY

const handleSubmit = async () => {
  status.value = ''
  loading.value = true

  try {
    await emailjs.send(
      'service_wn78sgc',      // ✅ service ID
      'template_gxz5kzl',     // ✅ template ID
      {
        name: name.value,
        email: email.value,
        message: message.value,
      }
    )

    status.value = '✅ Message sent successfully!'
    name.value = ''
    email.value = ''
    message.value = ''
  } catch (error) {
    console.error('EmailJS error:', error)
    status.value = '❌ Failed to send message. Check console.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="contact">
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
        {{ loading ? 'Sending…' : 'Send Message' }}
      </button>
    </form>

    <p v-if="status">{{ status }}</p>
  </section>
</template>

<style scoped>
.contact {
  max-width: 500px;
  margin: 2rem auto;
}
input,
textarea {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.6rem;
}
button {
  padding: 0.6rem 1.2rem;
}
</style>
