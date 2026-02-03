<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Create Account</h1>

      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <button @click="register">Register</button>

      <p>
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import api from '../services/api'

export default {
  data() {
    return {
      email: '',
      password: '',
      error: ''
    }
  },
  methods: {
    async register() {
      try {
        await api.post('/auth/register', {
          email: this.email,
          password: this.password
        })

        this.$router.push('/login')
      } catch (err) {
        this.error = 'Registration failed'
      }
    }
  }
}
</script>
