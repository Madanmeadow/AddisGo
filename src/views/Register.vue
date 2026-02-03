<template>
  <div class="page">
    <h1>Create Account</h1>

    <input
      type="email"
      v-model="email"
      placeholder="Email"
    />

    <input
      type="password"
      v-model="password"
      placeholder="Password"
    />

    <button @click="register">Register</button>

    <p v-if="error" class="error">{{ error }}</p>

    <p>
      Already have an account?
      <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  name: "Register",
  data() {
    return {
      email: "",
      password: "",
      error: "",
    };
  },
  methods: {
    async register() {
      try {
        await api.post("/auth/register", {
          email: this.email,
          password: this.password,
        });

        // After successful register → go login
        this.$router.push("/login");
      } catch (err) {
        this.error = "Registration failed";
      }
    },
  },
};
</script>

<style scoped>
.page {
  max-width: 400px;
  margin: 100px auto;
  text-align: center;
}

input {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  padding: 10px;
}

button {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

.error {
  color: #dc2626;
  margin-top: 10px;
}
</style>
