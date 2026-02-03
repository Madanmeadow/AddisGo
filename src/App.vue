<template>
  <div id="app">
    <!-- Top Navbar -->
    <header class="navbar">
      <h1 class="logo">AddisGo</h1>

      <button
        v-if="isAuthenticated"
        class="logout-btn"
        @click="logout"
      >
        Logout
      </button>
    </header>

    <!-- Page Content -->
    <main class="page">
      <!-- Auth pages -->
      <router-view v-if="!isAuthenticated" />

      <!-- Dashboard -->
      <div v-else class="dashboard">
        <h2>Dashboard</h2>
        <p>You are logged in 🎉</p>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: "App",

  data() {
    return {
      isAuthenticated: false,
    };
  },

  mounted() {
    this.syncAuth();
  },

  watch: {
    $route() {
      this.syncAuth();
    },
  },

  methods: {
    syncAuth() {
      const token = localStorage.getItem("token");
      this.isAuthenticated = !!token;

      // redirect logic
      if (this.isAuthenticated && this.$route.path === "/login") {
        this.$router.push("/dashboard");
      }

      if (!this.isAuthenticated && this.$route.path === "/dashboard") {
        this.$router.push("/login");
      }
    },

    logout() {
      localStorage.removeItem("token");
      this.isAuthenticated = false;
      this.$router.push("/login");
    },
  },
};
</script>

<style>
/* Layout */
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #6b7c93, #889db8);
}

/* Navbar */
.navbar {
  height: 60px;
  background: linear-gradient(90deg, #1e88e5, #26c6da);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: white;
}

.logo {
  font-size: 20px;
  font-weight: bold;
}

/* Logout button */
.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* Page content */
.page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 80px;
}

/* Dashboard */
.dashboard {
  background: white;
  padding: 30px 40px;
  border-radius: 14px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
}
</style>
