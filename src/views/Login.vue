<template>
  <div class="auth-container">
    <h2>Login</h2>

    <form @submit.prevent="handleLogin">
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

      <button type="submit">Login</button>

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
      error: ""
    }
  },
  methods: {
    async handleLogin() {
      try {
        const res = await axios.post(
          "https://addisgo-1.onrender.com/api/auth/login",
          {
            email: this.email,
            password: this.password
          }
        )

        localStorage.setItem("token", res.data.token)

        this.$router.push("/dashboard")

      } catch (err) {
        this.error =
          err.response?.data?.message || "Login failed"
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
</style>




