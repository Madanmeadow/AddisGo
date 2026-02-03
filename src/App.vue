<template>
  <div id="app">
    <!-- Top Nav -->
    <header class="navbar">
      <div class="brand">AddisGo</div>

      <button
        v-if="isLoggedIn"
        class="logout-btn"
        @click="logout"
      >
        Logout
      </button>
    </header>

    <!-- Page Content -->
    <main class="page">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',

  computed: {
    isLoggedIn() {
      return !!localStorage.getItem('token')
    }
  },

  methods: {
    logout() {
      localStorage.removeItem('token')
      this.$router.replace('/login')
    }
  }
}
</script>

<style>
/* ===== GLOBAL LAYOUT ===== */
html, body, #app {
  height: 100%;
  margin: 0;
}

/* ===== NAVBAR ===== */
.navbar {
  height: 56px;
  background: linear-gradient(90deg, #1e88e5, #26c6da);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-weight: 600;
}

.brand {
  font-size: 18px;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* ===== PAGE BACKGROUND ===== */
.page {
  min-height: calc(100vh - 56px);
  background: #6b7c93; /* mid-tone gray */
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
</style>
