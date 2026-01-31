<template>
  <div class="profile">
    <h1>My Profile</h1>

    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>User ID:</strong> {{ user.id }}</p>

    <button @click="logout">Logout</button>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  data() {
    return {
      user: {}
    };
  },

  async mounted() {
    const token = localStorage.getItem("token");

    if (!token) {
      this.$router.push("/login");
      return;
    }

    try {
      const res = await api.get("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      this.user = res.data;
    } catch (err) {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  },

  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  }
};
</script>

<style scoped>
.profile {
  max-width: 400px;
  margin: 80px auto;
  padding: 30px;
  background: white;
  border-radius: 10px;
  text-align: center;
}
button {
  margin-top: 20px;
}
</style>
