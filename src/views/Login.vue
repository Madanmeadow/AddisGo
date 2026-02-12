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

<script setup>
import { ref } from "vue"
import axios from "axios"
import { useRouter } from "vue-router"

const router = useRouter()

const email = ref("")
const password = ref("")
const error = ref("")

const login = async () => {
  try {
    const res = await axios.post(
      "https://addisgo-1.onrender.com/api/auth/login",
      {
        email: email.value,
        password: password.value,
      }
    )

    localStorage.setItem("token", res.data.token)

    router.push("/dashboard")

  } catch (err) {
    error.value = "Login failed. Please try again."
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




