<script setup>
import { ref, onMounted } from "vue";
import socket from "@/services/socket";

const messages = ref([]);
const text = ref("");

onMounted(() => {
  socket.on("message", msg => {
    messages.value.push(msg);
  });
});

function sendMessage() {
  if (!text.value) return;
  socket.emit("message", text.value);
  text.value = "";
}
</script>

<template>
  <div>
    <h1>Chat</h1>

    <div v-for="(m, i) in messages" :key="i">
      {{ m }}
    </div>

    <input v-model="text" placeholder="Type..." />
    <button @click="sendMessage">Send</button>
  </div>
</template>
