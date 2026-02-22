<template>
  <div class="messages-container">
    <h2>💬 Messages</h2>

    <div class="chat-box">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['bubble', msg.userId === user.id ? 'me' : 'other']"
      >
        {{ msg.text }}
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="text"
        placeholder="Type message..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL;
const user = JSON.parse(localStorage.getItem("user"));

const messages = ref([]);
const text = ref("");

const socket = io(apiUrl, {
  transports: ["websocket"]
});

onMounted(() => {
  socket.emit("join-room", "global");

  socket.on("receive-message", (msg) => {
    messages.value.push(msg);
  });
});

onUnmounted(() => {
  socket.disconnect();
});

function sendMessage() {
  if (!text.value.trim()) return;

  const message = {
    text: text.value,
    userId: user.id,
    room: "global"
  };

  socket.emit("send-message", message);

  text.value = "";
}
</script>

<style scoped>
.messages-container {
  padding: 30px;
}

.chat-box {
  height: 400px;
  overflow-y: auto;
  background: #1f2c3c;
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.bubble {
  padding: 12px 18px;
  margin-bottom: 10px;
  border-radius: 20px;
  max-width: 60%;
  color: white;
}

.me {
  background: #ff4d4d;
  margin-left: auto;
}

.other {
  background: #444;
}

.input-area {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
}

button {
  padding: 12px 20px;
  border: none;
  background: #ff4d4d;
  color: white;
  border-radius: 10px;
  cursor: pointer;
}
</style>