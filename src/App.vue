<template>
  <div id="app">
    <!-- Top Navbar -->
    <header class="navbar">
      <div class="brand" @click="goHome">MeDan</div>

      <button
        v-if="isLoggedIn"
        class="logout-btn"
        @click="logout"
      >
        Logout
      </button>
    </header>

    <!-- Main content (THIS IS CRITICAL) -->
    <main class="page-container">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: "App",

  computed: {
    isLoggedIn() {
      return !!localStorage.getItem("token");
    }
  },

  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },

    goHome() {
      if (this.isLoggedIn) {
        this.$router.push("/dashboard");
      } else {
        this.$router.push("/login");
      }
    }
  }
};
</script>

<style>
/* ===== GLOBAL RESET ===== */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #6f7f95;
}

/* ===== APP WRAPPER ===== */
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== NAVBAR ===== */
.navbar {
  height: 60px;
  background: linear-gradient(90deg, #1e90ff, #23c6b8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.brand {
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
}

/* ===== LOGOUT BUTTON ===== */
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

/* ===== PAGE CONTENT ===== */
.page-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 60px;
}
</style>
