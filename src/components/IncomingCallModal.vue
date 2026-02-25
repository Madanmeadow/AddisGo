<template>
  <div v-if="modelValue" class="backdrop">
    <div class="card">
      <div class="title">📞 Incoming {{ call.kind === "video" ? "Video" : "Audio" }} Call</div>
      <div class="from">From: <strong>{{ call.fromUsername }}</strong></div>

      <div class="actions">
        <button class="btn danger" @click="reject">Reject</button>
        <button class="btn primary" @click="accept">Accept</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  modelValue: Boolean,
  call: { type: Object, default: () => ({}) },
  socket: { type: Object, default: null }, // this is socketRef.value
});
const emit = defineEmits(["update:modelValue"]);
const router = useRouter();

function close() {
  emit("update:modelValue", false);
}

function reject() {
  props.socket?.emit("call:reject", {
    roomId: props.call.roomId,
    fromSocketId: props.call.fromSocketId,
  });
  close();
}

function accept() {
  props.socket?.emit("call:accept", {
    roomId: props.call.roomId,
    fromSocketId: props.call.fromSocketId,
    kind: props.call.kind,
  });

  // Go to call page as callee and wait for offer
  router.push({
    path: "/call",
    query: {
      roomId: props.call.roomId,
      role: "callee",
      kind: props.call.kind,
      otherSocketId: props.call.fromSocketId,
    },
  });

  close();
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 9999;
}
.card {
  width: min(420px, 92vw);
  background: rgba(20, 26, 40, 0.94);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 18px;
  padding: 16px;
  color: white;
}
.title { font-weight: 900; font-size: 18px; margin-bottom: 8px; }
.from { opacity: .9; margin-bottom: 14px; }
.actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
}
.btn.primary { background: linear-gradient(45deg, #ff416c, #ff4b2b); }
.btn.danger { background: rgba(255,80,80,0.22); border: 1px solid rgba(255,80,80,0.35); }
</style>