<template>
  <div class="card">
    <h2>Login</h2>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <p v-if="error" class="error">{{ error }}</p>

    <button @click="login">Login</button>

    <p>
      No account?
      <router-link to="/register">Register</router-link>
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
    async login() {
      try {
        const res = await api.post("/api/auth/login", {
          email: this.email,
          password: this.password
        });

        localStorage.setItem("token", res.data.token);
        this.$router.push("/dashboard");
      } catch {
        this.error = "Login failed";
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
input, button {
  width: 100%;
  margin-top: 10px;
}
.error {
  color: red;
}
</style>
