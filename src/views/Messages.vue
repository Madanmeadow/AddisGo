<template>
  <Layout>
    <h2>💬 Inbox</h2>

    <div class="chat-container">
      <div class="messages">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message', msg.sender === user.name ? 'me' : 'other']"
        >
          {{ msg.text }}
        </div>
      </div>

      <div class="input-area">
        <input
          v-model="newMessage"
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
        />
        <button @click="sendMessage">Send</button>
      </div>
    </div>

  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { io } from "socket.io-client";
import Layout from "../components/Layout.vue";

const socket = io(import.meta.env.VITE_API_URL);

const messages = ref([]);
const newMessage = ref("");
const user = JSON.parse(localStorage.getItem("user"));

const room = "global-chat";

onMounted(() => {
  socket.emit("join-room", room);

  socket.on("receive-message", (data) => {
    messages.value.push(data);
  });
});

function sendMessage() {
  if (!newMessage.value) return;

  const messageData = {
    room,
    sender: user.name,
    text: newMessage.value
  };

  socket.emit("send-message", messageData);
  messages.value.push(messageData);

  newMessage.value = "";
}
</script>

<style scoped>
.chat-container {
  margin-top: 30px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 20px;
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  padding: 10px 15px;
  border-radius: 15px;
  max-width: 60%;
}

.me {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  align-self: flex-end;
}

.other {
  background: rgba(255,255,255,0.2);
  align-self: flex-start;
}

.input-area {
  display: flex;
  margin-top: 10px;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
}

button {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  color: white;
  cursor: pointer;
}
</style>