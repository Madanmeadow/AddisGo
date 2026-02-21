<template>
  <div class="dashboard">

    <aside class="sidebar">
      <h1 class="logo">🔥 AddisGo</h1>

      <nav>
        <router-link to="/dashboard">🏠 Home</router-link>
        <router-link to="/messages">💬 Inbox</router-link>
        <router-link to="/live">📹 Live</router-link>
      </nav>

      <div class="bottom">
        <button @click="logout">Logout</button>
      </div>
    </aside>

    <main class="main">
      <slot />
    </main>

  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

function logout() {
  localStorage.clear();
  router.push("/login");
}
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #141e30, #243b55);
  color: white;
}

.sidebar {
  width: 250px;
  background: rgba(0,0,0,0.6);
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 40px;
}

.sidebar a {
  color: white;
  text-decoration: none;
  font-size: 18px;
}

.bottom {
  margin-top: auto;
}

.bottom button {
  padding: 10px;
  background: crimson;
  border: none;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

.main {
  flex: 1;
  padding: 40px;
}
</style>