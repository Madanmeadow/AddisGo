<template>
  <div class="live">
    <h2>You're Live</h2>

    <video ref="localVideo" autoplay playsinline muted class="video"></video>

    <div class="row">
      <button @click="startLive" :disabled="isLive">Start Live</button>
      <button @click="endLive" :disabled="!isLive">End Live</button>
      <div>Viewers: {{ viewerCount }}</div>
      <div>Live ID: {{ liveId }}</div>
    </div>

    <div class="chat">
      <div class="messages">
        <div v-for="(m, i) in chat" :key="i">
          <b>{{ m.from?.username || "Anon" }}:</b> {{ m.message }}
        </div>
      </div>
      <div class="input">
        <input v-model="chatText" placeholder="Say something..." @keydown.enter="sendChat" />
        <button @click="sendChat">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";
import { createSocket } from "@/realtime/socket";

// You already have auth token in your app; use your real source:
const token = localStorage.getItem("token");

const socket = createSocket(token);

const localVideo = ref(null);
const isLive = ref(false);
const viewerCount = ref(0);
const chat = ref([]);
const chatText = ref("");

const liveId = ref(`live-${Math.random().toString(36).slice(2, 10)}`);

let localStream = null;

// For MVP fan-out: one RTCPeerConnection per viewer socketId
const peers = new Map(); // viewerSocketId -> RTCPeerConnection

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(import.meta.env.VITE_TURN_URL
    ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USER,
        credential: import.meta.env.VITE_TURN_PASS,
      }]
    : []),
];

function addLocalTracks(pc) {
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
}

async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true,
  });
  localVideo.value.srcObject = localStream;
}

async function createPeerForViewer(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: viewerSocketId,
        candidate: e.candidate,
      });
    }
  };

  addLocalTracks(pc);

  peers.set(viewerSocketId, pc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", {
    liveId: liveId.value,
    to: viewerSocketId,
    offer: pc.localDescription,
  });
}

function closePeer(viewerSocketId) {
  const pc = peers.get(viewerSocketId);
  if (pc) {
    pc.close();
    peers.delete(viewerSocketId);
  }
}

async function startLive() {
  if (isLive.value) return;
  await startCamera();

  socket.emit("live:create", { liveId: liveId.value });
  isLive.value = true;
}

function endLive() {
  socket.emit("live:end", { liveId: liveId.value });

  for (const [id] of peers) closePeer(id);

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  isLive.value = false;
}

function sendChat() {
  const msg = chatText.value.trim();
  if (!msg) return;
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

// Socket events
socket.on("live:presence", ({ viewerCount: c }) => {
  viewerCount.value = c;
});

socket.on("live:chat", (m) => {
  if (m.liveId === liveId.value) chat.value.push(m);
});

// When viewer joins, host creates peer connection and sends offer
socket.on("live:viewer-joined", async ({ viewerSocketId }) => {
  if (!isLive.value) return;
  await createPeerForViewer(viewerSocketId);
});

socket.on("live:viewer-left", ({ viewerSocketId }) => {
  closePeer(viewerSocketId);
});

// Receive viewer answer
socket.on("webrtc:answer", async ({ from, answer }) => {
  const pc = peers.get(from);
  if (!pc) return;
  await pc.setRemoteDescription(answer);
});

// Receive viewer ICE
socket.on("webrtc:ice", async ({ from, candidate }) => {
  const pc = peers.get(from);
  if (!pc) return;
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
});

onBeforeUnmount(() => {
  endLive();
  socket.disconnect();
});
</script>

<style scoped>
.live { padding: 16px; }
.video { width: 100%; max-width: 720px; background: #000; border-radius: 12px; }
.row { display: flex; gap: 12px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
.chat { margin-top: 16px; max-width: 720px; }
.messages { border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 10px; min-height: 160px; }
.input { display:flex; gap:10px; margin-top:10px; }
input { flex:1; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background: transparent; color: inherit; }
</style>