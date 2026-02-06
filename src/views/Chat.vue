<script setup>
import { ref, onMounted } from "vue";
import socket from "@/services/socket";
import { getMessages, sendMessage } from "@/services/messages";

const conversationId = "123";
const messages = ref([]);
const newMessage = ref("");
const typingUser = ref(null);
let timeout = null;

onMounted(async () => {
  const res = await getMessages(conversationId);
  messages.value = res.data.messages;

  socket.emit("join-conversation", conversationId);

  socket.on("new-message", msg => messages.value.push(msg));
  socket.on("user-typing", user => typingUser.value = user);
  socket.on("user-stop-typing", () => typingUser.value = null);
});

const send = async () => {
  const res = await sendMessage(conversationId, newMessage.value);
  socket.emit("send-message", res.data);
  newMessage.value = "";
};

const typing = () => {
  socket.emit("typing", { conversationId, userId: "user123" });
  clearTimeout(timeout);
  timeout = setTimeout(() =>
    socket.emit("stop-typing", { conversationId }), 800);
};
</script>

<template>
  <h2>Chat</h2>

  <div v-for="m in messages" :key="m.id">
    <b>{{ m.senderId }}:</b> {{ m.text }}
  </div>

  <p v-if="typingUser">{{ typingUser }} is typing...</p>

  <input v-model="newMessage" @input="typing" @keyup.enter="send" />
  <button @click="send">Send</button>
</template>
