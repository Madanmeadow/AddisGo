<template>
  <section class="contact">
    <h2>Contact MeDan</h2>

    <form>
      <!-- Name -->
      <div>
        <label>Name</label>
        <input
          type="text"
          v-model="name"
          placeholder="Your name"
          required
        />
      </div>

      <!-- Email -->
      <div>
        <label>Email</label>
        <input
          type="email"
          v-model="email"
          placeholder="you@email.com"
          required
        />
      </div>

      <!-- Message -->
      <div>
        <label>Message</label>
        <textarea
          v-model="message"
          placeholder="Write your message..."
          required
        ></textarea>
      </div>

      <!-- ✅ BUTTON GOES HERE -->
      <button
        type="submit"
        @click.prevent="handleSubmit"
        :disabled="loading"
      >
        {{ loading ? 'Sending...' : 'Send Message' }}
      </button>

      <!-- Success / Error -->
      <p v-if="success" style="color: green;">{{ success }}</p>
      <p v-if="error" style="color: red;">{{ error }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { sendContactEmail } from '@/services/email'

const name = ref('')
const email = ref('')
const message = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    await sendContactEmail({
      name: name.value,
      email: email.value,
      message: message.value,
    })

    success.value = 'Message sent successfully!'
    name.value = ''
    email.value = ''
    message.value = ''
  } catch (err) {
    console.error('EmailJS error:', err)
    error.value = 'Something went wrong. Try again.'
  } finally {
    loading.value = false
  }
}
</script>
