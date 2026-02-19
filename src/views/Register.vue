<template>
  <div class="auth-container">
    <h2>Register</h2>

    <input
      v-model="name"
      type="text"
      placeholder="Name"
    />

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

    <button @click="register">
      Register
    </button>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>

    <p>
      Already have an account?
      <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const router = useRouter();

async function register() {
  try {
    errorMessage.value = "";

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    // Auto-login after register
    localStorage.setItem("user", JSON.stringify(data));

    router.push("/login");

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







