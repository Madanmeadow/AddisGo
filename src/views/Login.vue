<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
      <h1 class="text-2xl font-bold text-center mb-6">Login</h1>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <p v-if="error" class="text-red-500 text-sm mb-4 text-center">
        {{ error }}
      </p>

      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </div>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  name: "Login",
  data() {
    return {
      email: "",
      password: "",
      loading: false,
      error: null
    };
  },
  methods: {
    async login() {
      this.error = null;
      this.loading = true;
      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });
        localStorage.setItem("token", res.data.token);
        this.$router.push("/");
      } catch (err) {
        this.error =
          err.response?.data?.message ||
          "Invalid email or password";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
