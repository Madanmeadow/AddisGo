<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2>Create Account</h2>

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

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <button @click="register">Register</button>

      <p class="link">
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  data() {
    return {
      email: "",
      password: "",
      error: "",
      success: ""
    };
  },
  methods: {
    async register() {
      this.error = "";
      this.success = "";

      try {
        const res = await api.post("/api/auth/register", {
          email: this.email,
          password: this.password
        });

        this.success = "Registration successful 🎉";
        console.log(res.data);

        // redirect after success
        setTimeout(() => {
          this.$router.push("/login");
        }, 1000);

      } catch (err) {
        this.error =
          err.response?.data?.message ||
          "Registration failed";
      }
    }
  }
};
</script>

<style scoped>
.auth-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f4f6f8;
}

.auth-card {
  background: white;
  padding: 30px;
  width: 360px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  text-align: center;
}

input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
}

button {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.error {
  color: red;
}

.success {
  color: green;
}

.link {
  margin-top: 15px;
}
</style>
