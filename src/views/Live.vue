<template>
  <Layout>
    <div class="live-wrapper">

      <h2 class="title">📹 AddisGo 1-to-1 Live Call</h2>

      <div class="video-grid">
        <video ref="myVideo" autoplay muted playsinline></video>
        <video ref="userVideo" autoplay playsinline></video>
      </div>

      <div class="controls">
        <button @click="startMedia">Start Camera</button>
        <button v-if="inCall" @click="endCall" class="end-btn">End Call</button>
      </div>

      <h3 class="online-title">🟢 Online Users</h3>

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
import { ref, onMounted, onBeforeUnmount } from "vue";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";
import Peer from "simple-peer";

/* ===============================
   GLOBAL STATE
================================ */

let stream = null;
let peer = null;

const myVideo = ref(null);
const userVideo = ref(null);
const onlineUsers = ref([]);
const inCall = ref(false);

const socket = io(import.meta.env.VITE_API_URL);

const token = localStorage.getItem("token");

function parseJwt(token) {
  return JSON.parse(atob(token.split(".")[1]));
}

const userId = parseJwt(token).id;

/* ===============================
   SOCKET EVENTS
================================ */

onMounted(() => {

  socket.on("connect", () => {
    socket.emit("register-user", userId);
  });

  socket.on("online-users", (users) => {
    onlineUsers.value = users.filter(id => id !== userId);
  });

  /* 🔥 INCOMING CALL HANDLER */
  socket.on("incoming-call", ({ offer, fromUserId }) => {

    if (!stream) {
      alert("Start camera before answering call!");
      return;
    }

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
      inCall.value = true;
    });

    peer.signal(offer);
  });

  socket.on("call-answered", ({ answer }) => {
    peer.signal(answer);
  });

});

onBeforeUnmount(() => {
  if (peer) peer.destroy();
});

/* ===============================
   MEDIA FUNCTIONS
================================ */

async function startMedia() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    myVideo.value.srcObject = stream;

  } catch (err) {
    alert("Camera access denied.");
  }
}

function callUser(targetUserId) {

  if (!stream) {
    alert("Start camera first!");
    return;
  }

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
    inCall.value = true;
  });
}

function endCall() {
  if (peer) {
    peer.destroy();
    peer = null;
  }

  userVideo.value.srcObject = null;
  inCall.value = false;
}
</script>

<style scoped>

.live-wrapper {
  padding: 40px;
}

.title {
  font-size: 28px;
  margin-bottom: 30px;
}

.video-grid {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

video {
  width: 480px;
  height: 320px;
  background: black;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: 0 0 25px rgba(0,0,0,0.5);
}

.controls {
  margin-top: 25px;
  display: flex;
  gap: 15px;
}

button {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  color: white;
  cursor: pointer;
}

.end-btn {
  background: #d00000;
}

.online-title {
  margin-top: 40px;
}

.users {
  margin-top: 20px;
}

.user-card {
  background: rgba(255,255,255,0.08);
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  video {
    width: 100%;
    height: 220px;
  }
}

</style>