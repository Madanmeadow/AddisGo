<template>
  <div class="auth-card">
    <h2>Login</h2>

    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <p v-if="error" class="error">{{ error }}</p>

    <button @click="login">Login</button>
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
      error: null
    };
  },
  methods: {
    async login() {
      this.error = null;
      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });

        // ✅ SAVE TOKEN
        localStorage.setItem("token", res.data.token);

        // ✅ REDIRECT
        this.$router.push("/dashboard");

      } catch (err) {
        this.error = "Login failed";
      }
    }
  }
};
</script>

<style scoped>
.auth-card {
  max-width: 350px;
  margin: 80px auto;
  padding: 25px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.1);
}
input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
}
button {
  width: 100%;
  padding: 10px;
  background: #1e88e5;
  color: white;
  border: none;
  cursor: pointer;
}
.error {
  color: red;
}
</style>
