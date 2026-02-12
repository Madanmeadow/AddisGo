<template>
  <div>
    <h1>Register</h1>

    <input v-model="name" placeholder="Name" />
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="register">Register</button>

    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      name: "",
      email: "",
      password: "",
      error: ""
    };
  },

  methods: {
    async register() {
      try {
        const response = await axios.post(
          "http://localhost:5000/api/auth/register",
          {
            name: this.name,
            email: this.email,
            password: this.password,
          }
        );

        console.log("SUCCESS 🔥", response.data);

        // optional redirect
        this.$router.push("/login");

      } catch (err) {
        console.log("ERROR ❌", err);
        this.error = "Server error";
      }
    },
  },
};
</script>





