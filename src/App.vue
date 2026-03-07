<!-- src/App.vue -->
<template>
  <!-- ✅ Main landmark for accessibility -->
  <main id="main" role="main" class="app-main">
    <router-view v-slot="{ Component }">
      <KeepAlive include="Call">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </main>

  <!-- ✅ Floating mini call overlay -->
  <MiniCallOverlay />

  <!-- ✅ Global toast host -->
  <ToastHost />

  <!-- ✅ Screen reader live region -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    {{ announcement }}
  </div>

  <!-- ✅ Optional mobile bottom nav hook -->
  <!--
  <nav class="bottom-nav" aria-label="Primary">
    <button class="navbtn" aria-label="Feed">🏠</button>
    <button class="navbtn" aria-label="Live">🔴</button>
    <button class="navbtn" aria-label="Messages">💬</button>
    <button class="navbtn" aria-label="Profile">👤</button>
  </nav>
  -->
</template>

<script setup>
import { ref, KeepAlive } from "vue"
import ToastHost from "./components/ToastHost.vue"
import MiniCallOverlay from "./components/call/MiniCallOverlay.vue"

/**
 * You can update this later from anywhere
 * by creating a tiny event bus or Pinia store.
 */
const announcement = ref("")
</script>

<style>
/* Minimal app wrapper spacing (global look handled in src/style.css) */
.app-main {
  min-height: 100vh;
}

/* Screen-reader only utility */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
</style>