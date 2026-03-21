<template>
  <div class="app-shell">
    <!-- LEFT SIDEBAR (Desktop only) -->
    <aside class="sidebar" v-if="!isMobile">
      <div class="logo">
        <div class="logo-icon">🔥</div>
        <div class="logo-text">
          <div class="logo-title">Pulse</div>
          <div class="logo-sub">Social • Live • Chat</div>
        </div>
      </div>

      <nav class="side-nav">
        <button class="side-link" :class="{ active: isActive('/') }" @click="go('/')">
          🏠 <span>Home</span>
        </button>

        <button class="side-link" :class="{ active: isActive('/inbox') }" @click="go('/inbox')">
          💬 <span>Inbox</span>
        </button>

        <button class="side-link" :class="{ active: isActive('/live') }" @click="go('/live')">
          📡 <span>Live</span>
        </button>

        <button class="side-link" :class="{ active: isActive('/profile') }" @click="go('/profile')">
          👤 <span>Profile</span>
        </button>
      </nav>
    </aside>

    <!-- MAIN -->
    <main class="main">
      <slot />
    </main>

    <!-- BOTTOM NAV (Mobile only, shows on ALL tabs including Profile) -->
    <footer class="bottom-nav" v-if="isMobile">
      <button class="bn-item" :class="{ active: isActive('/') }" @click="go('/')">
        <div class="bn-ico">🏠</div>
        <div class="bn-txt">Home</div>
      </button>

      <button class="bn-item" :class="{ active: isActive('/inbox') }" @click="go('/inbox')">
        <div class="bn-ico">💬</div>
        <div class="bn-txt">Inbox</div>
      </button>

      <button class="bn-item" :class="{ active: isActive('/live') }" @click="go('/live')">
        <div class="bn-ico">🔴</div>
        <div class="bn-txt">Live</div>
      </button>

      <button class="bn-item" :class="{ active: isActive('/profile') }" @click="go('/profile')">
        <div class="bn-ico">👤</div>
        <div class="bn-txt">Profile</div>
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.matchMedia("(max-width: 860px)").matches;
}

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
onBeforeUnmount(() => window.removeEventListener("resize", checkMobile));

function go(path) {
  if (route.path !== path) router.push(path);
}

function isActive(path) {
  // exact match for /, startsWith for others
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #0b0f1a;
}

/* Desktop sidebar */
.sidebar {
  width: 260px;
  padding: 18px 14px;
  background: rgba(12, 18, 30, 0.75);
  border-right: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(14px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.logo-icon { font-size: 22px; }
.logo-title { font-weight: 800; color: #fff; font-size: 18px; }
.logo-sub { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 2px; }

.side-nav { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  cursor: pointer;
  padding: 12px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  font-size: 15px;
}
.side-link span { font-weight: 700; }
.side-link.active {
  background: rgba(255, 72, 72, 0.22);
  outline: 1px solid rgba(255, 72, 72, 0.35);
}

.main {
  flex: 1;
  padding-bottom: 86px; /* reserve space for bottom nav on mobile */
}

/* Mobile bottom nav */
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 74px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(10, 14, 24, 0.88);
  border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(14px);
  z-index: 50;
}

.bn-item {
  width: 25%;
  height: 100%;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.bn-ico { font-size: 18px; }
.bn-txt { font-size: 11px; font-weight: 800; letter-spacing: 0.2px; }

.bn-item.active {
  color: #fff;
}
.bn-item.active .bn-ico {
  transform: translateY(-1px);
}
</style>