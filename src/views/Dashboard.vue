<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>You are logged in 🎉</p>
    <button @click="logout">Logout</button>
  </div>
</template>

<script>
export default {
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  }
};
</script>
