<template>
  <div class="login">
    <h1>Login</h1>

    <input
      v-model="email"
      type="email"
      placeholder="Email"
    />

    <input
      v-model="password"
      type="password"
      placeholder="Password"
    />

    <button @click="login">Login</button>

    <p v-if="error" style="color: red;">
      {{ error }}
    </p>
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
    async login() {
      this.error = ""

      try {
        const res = await axios.post(
          "http://localhost:5000/api/auth/login",
          {
            email: this.email,
            password: this.password
          }
        )

        // Save token
        localStorage.setItem("token", res.data.token)

        // Go to dashboard
        this.$router.push("/dashboard")

      } catch (err) {
        this.error = "Login failed. Please try again."
        console.log(err)
      }
    }
  }
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  width: 300px;
  margin: 100px auto;
  gap: 10px;
}
</style>




