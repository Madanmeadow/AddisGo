<script setup>
import { ref } from 'vue'
import { login } from '../services/auth'

const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  try {
    const res = await login(email.value, password.value)
    localStorage.setItem('token', res.token)
    alert('Logged in!')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <h2>Login</h2>

  <input v-model="email" placeholder="Email" />
  <input v-model="password" type="password" placeholder="Password" />
  <button @click="submit">Login</button>

  <p v-if="error" style="color:red">{{ error }}</p>
</template>

