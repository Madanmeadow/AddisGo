<template>
  <Layout>
    <h2>📹 1-to-1 Video Call</h2>

    <div class="live-box">
      <video ref="myVideo" autoplay muted playsinline></video>
      <video ref="userVideo" autoplay playsinline></video>

      <div class="controls">
        <button @click="startMedia">Start Camera</button>
        <button @click="callUser">Call User</button>
      </div>

      <p>Your Socket ID:</p>
      <input v-model="myId" readonly />

      <p>Call This ID:</p>
      <input v-model="callToId" placeholder="Enter other user's ID" />
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
const myId = ref("");
const callToId = ref("");

let stream;
let peer;

onMounted(() => {
  socket.on("connect", () => {
    myId.value = socket.id;
  });

  socket.on("incoming-call", async ({ offer, from }) => {
    peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on("signal", (answer) => {
      socket.emit("answer-call", {
        answer,
        to: from
      });
    });

    peer.on("stream", (userStream) => {
      userVideo.value.srcObject = userStream;
    });

    peer.signal(offer);
  });

  socket.on("call-answered", ({ answer }) => {
    peer.signal(answer);
  });

  socket.on("ice-candidate", (candidate) => {
    peer.signal(candidate);
  });
});

async function startMedia() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  myVideo.value.srcObject = stream;
}

function callUser() {
  peer = new Peer({
    initiator: true,
    trickle: false,
    stream
  });

  peer.on("signal", (offer) => {
    socket.emit("call-user", {
      offer,
      to: callToId.value
    });
  });

  peer.on("stream", (userStream) => {
    userVideo.value.srcObject = userStream;
  });
}
</script>

<style scoped>
.live-box {
  margin-top: 40px;
  background: rgba(255,255,255,0.1);
  padding: 30px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

video {
  width: 100%;
  max-height: 300px;
  border-radius: 20px;
  background: black;
}

.controls {
  display: flex;
  gap: 20px;
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