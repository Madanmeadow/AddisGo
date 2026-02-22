<template>
  <Layout>
    <div class="live-container">

      <h2>📹 AddisGo 1-to-1 Live Call</h2>

      <!-- VIDEO AREA -->
      <div class="videos">
        <video ref="localVideo" autoplay muted playsinline></video>
        <video ref="remoteVideo" autoplay playsinline></video>
      </div>

      <!-- CONTROLS -->
      <div class="controls">
        <button @click="startCamera">Start Camera</button>
        <button @click="callUser" :disabled="!selectedUser">
          Call
        </button>
      </div>

      <!-- ONLINE USERS -->
      <div class="users">
        <h3>🟢 Online Users</h3>
        <div
          v-for="user in onlineUsers"
          :key="user.userId"
          class="user-card"
          @click="selectUser(user)"
          :class="{ active: selectedUser?.userId === user.userId }"
        >
          User {{ user.userId }}
        </div>
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

const localVideo = ref(null);
const remoteVideo = ref(null);

const localStream = ref(null);
const peerConnection = ref(null);

const onlineUsers = ref([]);
const selectedUser = ref(null);

/* =============================
   STUN + TURN CONFIG
============================= */

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

/* =============================
   START CAMERA
============================= */

async function startCamera() {
  localStream.value = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.value.srcObject = localStream.value;
}

/* =============================
   CREATE PEER
============================= */

function createPeer() {
  peerConnection.value = new RTCPeerConnection(rtcConfig);

  localStream.value.getTracks().forEach(track => {
    peerConnection.value.addTrack(track, localStream.value);
  });

  peerConnection.value.ontrack = event => {
    remoteVideo.value.srcObject = event.streams[0];
  };

  peerConnection.value.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        to: selectedUser.value.socketId,
        candidate: event.candidate
      });
    }
  };
}

/* =============================
   CALL USER
============================= */

async function callUser() {
  createPeer();

  const offer = await peerConnection.value.createOffer();
  await peerConnection.value.setLocalDescription(offer);

  socket.emit("call-user", {
    to: selectedUser.value.socketId,
    offer
  });
}

/* =============================
   SOCKET EVENTS
============================= */

onMounted(() => {

  socket.emit("register-user", user.id);

  socket.on("online-users", users => {
    onlineUsers.value = users.map(([userId, socketId]) => ({
      userId,
      socketId
    })).filter(u => u.userId !== user.id);
  });

  socket.on("incoming-call", async ({ offer, from }) => {
    selectedUser.value = { socketId: from };

    createPeer();

    await peerConnection.value.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    const answer = await peerConnection.value.createAnswer();
    await peerConnection.value.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: from,
      answer
    });
  });

  socket.on("call-answered", async ({ answer }) => {
    await peerConnection.value.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  });

  socket.on("ice-candidate", async candidate => {
    try {
      await peerConnection.value.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch (err) {
      console.error(err);
    }
  });

});

/* =============================
   SELECT USER
============================= */

function selectUser(user) {
  selectedUser.value = user;
}
</script>

<style scoped>
.live-container {
  max-width: 900px;
  margin: auto;
  padding: 30px;
}

.videos {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

video {
  width: 50%;
  border-radius: 15px;
  background: black;
}

.controls button {
  margin-right: 10px;
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: #ff4b2b;
  color: white;
}

.users {
  margin-top: 20px;
}

.user-card {
  padding: 10px;
  background: rgba(255,255,255,0.1);
  margin-bottom: 10px;
  border-radius: 10px;
  cursor: pointer;
}

.user-card.active {
  background: #ff4b2b;
}
</style>