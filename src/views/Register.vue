<template>
  <div>
    <h2>Register</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="handleRegister">Register</button>
  </div>
</template>

<script>
import { register } from "@/services/auth";

export default {
  data() {
    return {
      email: "",
      password: ""
    };
  },
  methods: {
    async handleRegister() {
      try {
        await register({
          email: this.email,
          password: this.password
        });
        alert("Registered successfully");
        this.$router.push("/login");
      } catch (err) {
        alert(err.response?.data?.message || "Register failed");
      }
    }
  }
};
</script>
