<template>
  <div class="toasts">
    <transition-group name="fade-up">
      <div v-for="t in toastState.items" :key="t.id" class="toast glass">
        <span class="dot" :class="t.type"></span>
        <div class="msg">{{ t.msg }}</div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToast } from "@/composables/useToast";
const { toastState } = useToast();
</script>

<style scoped>
.toasts{ position:fixed; right:14px; bottom:78px; display:flex; flex-direction:column; gap:10px; z-index:9999; }
.toast{ display:flex; align-items:center; gap:10px; padding:10px 12px; min-width:220px; }
.msg{ color: var(--text); font-size: 13px; }
.dot{ width:10px; height:10px; border-radius:50%; background: rgba(255,255,255,.35); }
.dot.info{ background: var(--brand2); }
.dot.ok{ background: var(--ok); }
.dot.warn{ background: var(--warn); }
</style>