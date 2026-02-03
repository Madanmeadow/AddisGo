<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p>You are logged in 🎉</p>

    <button @click="logout" class="logout-btn">
      Logout
    </button>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  methods: {
    logout() {
      // 1. Remove token
      localStorage.removeItem('token')

      // 2. Redirect to login
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.dashboard {
  text-align: center;
  margin-top: 60px;
}

.logout-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #c0392b;
}
</style>
