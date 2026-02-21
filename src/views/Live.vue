<template>
  <Layout>
    <h2>📹 AddisGo Live Call</h2>

    <div class="live-container">

      <div class="videos">
        <video ref="myVideo" autoplay muted playsinline></video>
        <video ref="userVideo" autoplay playsinline></video>
      </div>

      <div class="controls">
        <button @click="startMedia">Start Camera</button>
      </div>

      <h3>🟢 Online Users</h3>

      <div class="users">
        <div
          v-for="user in onlineUsers"
          :key="user"
          class="user-card"
        >
          <span>User ID: {{ user }}</span>
          <button @click="callUser(user)">Call</button>
        </div>
      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const socket = io(import.meta.env.VITE_API_URL);

const myVideo = ref(null);
const userVideo = ref(null);
const onlineUsers = ref([]);
const token = localStorage.getItem("token");

let stream;
let peer;

// Decode JWT to get user ID
function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

const userId = parseJwt(token).id;

onMounted(() => {
  socket.on("connect", () => {
    socket.emit("register-user", userId);
  });

  socket.on("online-users", (users) => {
    onlineUsers.value = users.filter(id => id !== userId);
  });

  socket.on("incoming-call", ({ offer, fromUserId }) => {
    peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on("signal", (answer) => {
      socket.emit("answer-call", {
        toUserId: fromUserId,
        answer
      });
    });

    peer.on("stream", (remoteStream) => {
      userVideo.value.srcObject = remoteStream;
    });

    peer.signal(offer);
  });

  socket.on("call-answered", ({ answer }) => {
    peer.signal(answer);
  });
});

async function startMedia() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  myVideo.value.srcObject = stream;
}

function callUser(targetUserId) {
  peer = new Peer({
    initiator: true,
    trickle: false,
    stream
  });

  peer.on("signal", (offer) => {
    socket.emit("call-user", {
      toUserId: targetUserId,
      fromUserId: userId,
      offer
    });
  });

  peer.on("stream", (remoteStream) => {
    userVideo.value.srcObject = remoteStream;
  });
}
</script>

<style scoped>
.live-container {
  margin-top: 30px;
}

.videos {
  display: flex;
  gap: 20px;
}

video {
  width: 300px;
  height: 200px;
  background: black;
  border-radius: 15px;
}

.controls {
  margin: 20px 0;
}

.users {
  margin-top: 20px;
}

.user-card {
  background: rgba(255,255,255,0.1);
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
}

button {
  background: #ff4b2b;
  border: none;
  padding: 8px 15px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}
</style>