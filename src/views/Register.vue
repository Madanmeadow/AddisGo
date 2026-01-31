<template>
  <div class="card">
    <h2>Create Account</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <p v-if="error" class="error">{{ error }}</p>

    <button @click="register">Register</button>

    <p>
      Already have an account?
      <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script>
import api from "../services/api";

export default {
  data() {
    return {
      email: "",
      password: "",
      error: ""
    };
  },
  methods: {
    async register() {
      try {
        await api.post("/api/auth/register", {
          email: this.email,
          password: this.password
        });
        this.$router.push("/login");
      } catch {
        this.error = "Registration failed";
      }
    }
  }
};
</script>

<style scoped>
.card {
  max-width: 350px;
  margin: 100px auto;
  padding: 30px;
  background: #fff;
  border-radius: 10px;
}
.error {
  color: red;
}
</style>
