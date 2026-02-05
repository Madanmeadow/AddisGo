<template>
  <nav class="app-navbar">
    <!-- Left -->
    <div class="logo">
      <router-link to="/dashboard">MeDan</router-link>
    </div>

    <!-- Center -->
    <ul class="nav-links">
      <li>
        <router-link to="/dashboard">Dashboard</router-link>
      </li>
      <li>
        <router-link to="/explore">Explore</router-link>
      </li>
      <li>
        <router-link to="/upload">Upload</router-link>
      </li>
    </ul>

    <!-- Right -->
    <div class="actions">
      <button class="logout-btn" @click="logout">Logout</button>
    </div>
  </nav>
</template>

<script>
export default {
  name: "AppNavbar",
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  }
};
</script>

<style scoped>
.app-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 32px;
  background: #ffffff;
  border-bottom: 1px solid #eee;
}

.logo a {
  font-size: 20px;
  font-weight: 700;
  color: #6366f1;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
  list-style: none;
}

.nav-links a {
  text-decoration: none;
  color: #374151;
  font-weight: 500;
}

.nav-links a.router-link-active {
  color: #6366f1;
}

.actions {
  display: flex;
  gap: 12px;
}

.logout-btn {
  background: transparent;
  border: 2px solid #6366f1;
  color: #6366f1;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn:hover {
  background: #eef2ff;
}
</style>
