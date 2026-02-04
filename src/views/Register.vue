<template>
  <div class="auth">
    <h1>Create account</h1>
    <p class="subtitle">Join MeDan</p>

    <form @submit.prevent="register">
      <input
        type="email"
        v-model="email"
        placeholder="Email"
        required
      />

      <input
        type="password"
        v-model="password"
        placeholder="Password"
        required
      />

      <button type="submit" :disabled="loading">
        {{ loading ? "Creating..." : "Register" }}
      </button>
    </form>

    <p class="switch">
      Already have an account?
      <router-link to="/login">Login</router-link>
    </p>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";

const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const register = async () => {
  error.value = "";
  loading.value = true;

  try {
    await api.post("/auth/register", {
      email: email.value,
      password: password.value,
    });

    router.push("/login");
  } catch (err) {
    error.value =
      err.response?.data?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth {
  max-width: 380px;
  margin: 120px auto;
  padding: 30px;
  background: #fff;
  border-radius: 14px;
  text-align: center;
}

input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
}

button {
  width: 100%;
  padding: 12px;
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.error {
  margin-top: 10px;
  color: red;
}

.switch {
  margin-top: 15px;
}

.subtitle {
  color: #666;
}
</style>

