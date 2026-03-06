<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();

async function login() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value
        })
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    router.push("/dashboard");
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <h1>⚡ Pulse Login</h1>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">
      {{ loading ? "Logging in..." : "Login" }}
    </button>

    <p class="error" v-if="error">{{ error }}</p>

    <router-link to="/register">Create account</router-link>
  </div>
</template>

<style scoped>
.auth {
  max-width: 400px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
input {
  padding: 12px;
  border-radius: 6px;
}
button {
  padding: 12px;
  background: crimson;
  color: white;
  border: none;
  border-radius: 6px;
}
.error {
  color: red;
}
</style>


