<template>
  <div class="login">
    <h2>Login</h2>

    <form @submit.prevent="login">
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

      <button type="submit" :disabled="loading">
        {{ loading ? "Logging in..." : "Login" }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">✅ Logged in successfully</p>
    </form>
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
      error: "",
      success: false,
    };
  },
  methods: {
    async login() {
      this.error = "";
      this.success = false;
      this.loading = true;

      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password,
        });

        // 🔐 Save JWT
        localStorage.setItem("token", res.data.token);

        this.success = true;
        console.log("TOKEN:", res.data.token);

        // optional redirect
        this.$router.push("/");
      } catch (err) {
        this.error =
          err.response?.data?.message || "Login failed";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 60px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
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
}

.error {
  color: red;
  margin-top: 10px;
}

.success {
  color: green;
  margin-top: 10px;
}
</style>

