<script setup>
import { ref } from 'vue'
import { sendContactEmail } from '../services/email'

const name = ref('')
const email = ref('')
const message = ref('')
const error = ref('')
const success = ref(false)

const handleSubmit = async () => {
  error.value = ''
  success.value = false

  try {
    await sendContactEmail({
      name: name.value,
      email: email.value,
      message: message.value,
    })

    success.value = true
    name.value = ''
    email.value = ''
    message.value = ''
  } catch (err) {
    console.error('EmailJS error:', err)
    error.value = 'Something went wrong. Try again.'
  }
}
</script>

<template>
  <div class="contact">
    <h2>Contact MeDan</h2>

    <form @submit.prevent="handleSubmit">
      <input v-model="name" placeholder="Name" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <textarea v-model="message" placeholder="Message" required />

      <button type="submit">Send Message</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">Message sent successfully!</p>
  </div>
</template>
