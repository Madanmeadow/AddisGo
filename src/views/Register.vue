<template>
  <div class="auth-container">
    <h2>Register</h2>

    <form @submit.prevent="handleRegister">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
      />

      <button type="submit">Register</button>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script>
import axios from "axios"

export default {
  data() {
    return {
      email: "",
      password: "",
      message: "",
      error: ""
    }
  },
  methods: {
    async handleRegister() {
      try {
        await axios.post(
          "https://addisgo-1.onrender.com/api/auth/register",
          {
            email: this.email,
            password: this.password
          }
        )

        this.message = "Registration successful! You can now login."
        this.error = ""

      } catch (err) {
        this.error =
          err.response?.data?.message || "Registration failed"
      }
    }
  }
}
</script>

<style>
.auth-container {
  max-width: 400px;
  margin: 100px auto;
  text-align: center;
}

input {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
}

button {
  padding: 10px 20px;
  cursor: pointer;
}

.error {
  color: red;
}

.success {
  color: green;
}
</style>






