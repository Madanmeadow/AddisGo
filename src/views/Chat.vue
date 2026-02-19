<template>
  <div class="chat-container">
    <div class="chat-header">
      💬 Conversation
    </div>

    <div class="messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="msg.sender_id === user.id ? 'my-msg' : 'their-msg'"
      >
        {{ msg.content }}
      </div>
    </div>

    <div class="chat-input">
      <input v-model="message" placeholder="Type message..." />
      <button @click="sendMessage">Send 🚀</button>
    </div>
  </div>
</template>

<script>
import { io } from "socket.io-client"

const socket = io(import.meta.env.VITE_API_URL)

export default {
  data() {
    return {
      user: JSON.parse(localStorage.getItem("user")),
      message: "",
      messages: [],
      roomId: "room-1"
    }
  },
  mounted() {
    socket.emit("join_room", this.roomId)

    socket.on("receive_message", (data) => {
      this.messages.push(data)
    })
  },
  methods: {
    sendMessage() {
      if (!this.message) return

      const msgData = {
        roomId: this.roomId,
        sender_id: this.user.id,
        content: this.message
      }

      socket.emit("send_message", msgData)
      this.messages.push(msgData)
      this.message = ""
    }
  }
}
</script>

<style>
.chat-container {
  max-width: 600px;
  margin: auto;
  background: #1e1e3f;
  border-radius: 20px;
  padding: 20px;
  color: white;
}

.messages {
  height: 400px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.my-msg {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  padding: 10px;
  margin: 5px;
  border-radius: 15px;
  text-align: right;
}

.their-msg {
  background: #444;
  padding: 10px;
  margin: 5px;
  border-radius: 15px;
}

.chat-input {
  display: flex;
  gap: 10px;
}
</style>
