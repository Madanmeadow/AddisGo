<template>
  <nav class="navbar">
    <!-- Logo -->
    <div class="logo">
      <router-link to="/">MeDan</router-link>
    </div>

    <!-- Links -->
    <ul class="nav-links">
      <li>
        <router-link to="/">Home</router-link>
      </li>

      <li v-if="isAuthenticated">
        <router-link to="/dashboard">Dashboard</router-link>
      </li>

      <li>
        <router-link to="/explore">Explore</router-link>
      </li>
    </ul>

    <!-- Auth buttons -->
    <div class="auth-actions">
      <template v-if="!isAuthenticated">
        <router-link to="/login" class="btn outline">Login</router-link>
        <router-link to="/register" class="btn primary">Sign Up</router-link>
      </template>

      <template v-else>
        <button class="btn outline" @click="logout">Logout</button>
      </template>
    </div>
  </nav>
</template>

<script>
export default {
  name: "NavBar",
  computed: {
    isAuthenticated() {
      return !!localStorage.getItem("token");
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
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid #eee;
  background: #ffffff;
}

.logo a {
  font-size: 22px;
  font-weight: bold;
  color: #7c3aed;
  text-decoration: none;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
}

.nav-links a.router-link-active {
  color: #7c3aed;
}

.auth-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
}

.primary {
  background: #7c3aed;
  color: white;
  border: none;
}

.outline {
  border: 2px solid #7c3aed;
  color: #7c3aed;
  background: transparent;
}
</style>
