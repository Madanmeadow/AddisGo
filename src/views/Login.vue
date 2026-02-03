<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Login</h1>

      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <button @click="login">Login</button>

      <p>
        No account?
        <router-link to="/register">Register</router-link>
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
    async login() {
      try {
        const res = await api.post('/auth/login', {
          email: this.email,
          password: this.password
        })

        localStorage.setItem('token', res.data.token)
        this.$router.push('/dashboard')
      } catch (err) {
        this.error = 'Login failed'
      }
    }
  }
}
</script>
