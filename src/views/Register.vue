<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();

async function register() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value
        })
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    router.push("/login");
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <h1>🚀 Create Account</h1>

    <input v-model="name" placeholder="Full Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="register">
      {{ loading ? "Creating..." : "Register" }}
    </button>

    <p class="error" v-if="error">{{ error }}</p>

    <router-link to="/login">Already have account?</router-link>
  </div>
</template>







