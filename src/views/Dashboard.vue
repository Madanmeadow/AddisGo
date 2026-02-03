<template>
  <div class="page-wrapper">
    <div class="auth-card">
      <h1>Dashboard</h1>
      <p>You are logged in 🎉</p>

      <button @click="logout" style="background:#dc2626">
        Logout
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "Dashboard",
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },
  },
};
</script>
