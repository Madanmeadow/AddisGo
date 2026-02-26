<template>
  <div class="toasts">
    <div v-for="t in toast.state.items" :key="t.id" class="toast" :class="t.type">
      <div class="msg">{{ t.message }}</div>
      <button class="x" @click="toast.dismiss(t.id)">✕</button>
    </div>
  </div>
</template>

<script setup>
import { toast } from "../lib/toast";
</script>

<style scoped>
.toasts {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 9999;
  display: grid;
  gap: 10px;
  width: min(420px, 92vw);
}
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  background: rgba(12, 18, 32, 0.95);
  border: 1px solid rgba(255,255,255,0.14);
  color: white;
}
.toast.success { border-color: rgba(0, 230, 118, 0.45); }
.toast.error { border-color: rgba(255, 80, 80, 0.45); }
.toast.info { border-color: rgba(80, 160, 255, 0.45); }

.msg { font-size: 13px; opacity: 0.95; }
.x {
  border: none;
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
}
</style>