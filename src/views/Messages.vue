<template>
  <Layout>
    <div class="chat-container">

      <h2>💬 Messages</h2>

      <div class="messages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['msg', msg.userId === user.id ? 'mine' : 'other']"
        >
          {{ msg.text }}
        </div>
      </div>

      <div class="input-area">
        <input v-model="text" placeholder="Type message..." />
        <button @click="sendMessage">Send</button>
      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL;
const user = JSON.parse(localStorage.getItem("user"));

const socket = io(apiUrl);

const messages = ref([]);
const text = ref("");

onMounted(() => {
  socket.emit("join-room", "global-chat");

  socket.on("receive-message", msg => {
    messages.value.push(msg);
  });
});

function sendMessage() {
  if (!text.value) return;

  const message = {
    id: Date.now(),
    text: text.value,
    userId: user.id,
    room: "global-chat"
  };

  socket.emit("send-message", message);
  messages.value.push(message);

  text.value = "";
}
</script>

<style scoped>
.chat-container {
  max-width: 600px;
  margin: auto;
  padding: 30px;
}

.messages {
  height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.msg {
  padding: 8px 12px;
  border-radius: 15px;
  margin-bottom: 10px;
  max-width: 70%;
}

.mine {
  background: #ff4b2b;
  color: white;
  margin-left: auto;
}

.other {
  background: rgba(255,255,255,0.1);
}

.input-area {
  display: flex;
}

input {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  margin-right: 10px;
}

button {
  padding: 8px 15px;
  border-radius: 10px;
  background: #ff4b2b;
  color: white;
  border: none;
}
</style>