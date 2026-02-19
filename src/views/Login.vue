<template>
  <div class="auth-container">
    <h2>Login</h2>

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

    <button @click="login">
      Login
    </button>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>

    <p>
      Don't have an account?
      <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const router = useRouter();

async function login() {
  try {
    errorMessage.value = "";

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.value,
          password: password.value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Save token and user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    router.push("/dashboard");

  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 100px auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input {
  padding: 10px;
}

button {
  padding: 10px;
  background: black;
  color: white;
  cursor: pointer;
}

.error {
  color: red;
}
</style>




