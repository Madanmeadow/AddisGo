<template>
  <div class="live">
    <h2>Watching Live</h2>

    <video ref="remoteVideo" autoplay playsinline controls class="video"></video>

    <div class="row">
      <input v-model="liveId" placeholder="Enter Live ID" />
      <button @click="joinLive" :disabled="joined">Join</button>
      <button @click="leaveLive" :disabled="!joined">Leave</button>
      <div>Viewers: {{ viewerCount }}</div>
    </div>

    <div v-if="ended" class="ended">Live ended.</div>

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

const token = localStorage.getItem("token");
const socket = createSocket(token);

const remoteVideo = ref(null);

const liveId = ref("");
const joined = ref(false);
const ended = ref(false);
const viewerCount = ref(0);

const chat = ref([]);
const chatText = ref("");

let pc = null;

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

function resetPeer() {
  if (pc) pc.close();
  pc = null;
  if (remoteVideo.value) remoteVideo.value.srcObject = null;
}

function sendChat() {
  const msg = chatText.value.trim();
  if (!msg || !joined.value) return;
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

function joinLive() {
  if (!liveId.value.trim()) return;
  ended.value = false;
  joined.value = true;
  socket.emit("live:join", { liveId: liveId.value.trim() });
}

function leaveLive() {
  if (!joined.value) return;
  socket.emit("live:leave", { liveId: liveId.value });
  joined.value = false;
  resetPeer();
}

// Presence + chat
socket.on("live:presence", ({ liveId: id, viewerCount: c }) => {
  if (id === liveId.value) viewerCount.value = c;
});

socket.on("live:chat", (m) => {
  if (m.liveId === liveId.value) chat.value.push(m);
});

socket.on("live:ended", ({ liveId: id }) => {
  if (id === liveId.value) {
    ended.value = true;
    joined.value = false;
    resetPeer();
  }
});

// Host tells us who to connect to (host socket id)
socket.on("live:host", ({ liveId: id, hostSocketId }) => {
  // viewer waits for offer from host
});

// Receive offer from host
socket.on("webrtc:offer", async ({ from, offer }) => {
  // from == hostSocketId
  if (!joined.value) return;

  resetPeer();
  pc = new RTCPeerConnection({ iceServers });

  pc.ontrack = (e) => {
    remoteVideo.value.srcObject = e.streams[0];
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: from,
        candidate: e.candidate,
      });
    }
  };

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("webrtc:answer", {
    liveId: liveId.value,
    to: from,
    answer: pc.localDescription,
  });
});

// Receive ICE from host
socket.on("webrtc:ice", async ({ candidate }) => {
  if (!pc) return;
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
});

onBeforeUnmount(() => {
  leaveLive();
  socket.disconnect();
});
</script>

<style scoped>
.live { padding: 16px; }
.video { width: 100%; max-width: 720px; background: #000; border-radius: 12px; }
.row { display:flex; gap: 10px; align-items:center; flex-wrap: wrap; margin: 12px 0; }
.ended { padding: 10px; border-radius: 12px; background: rgba(255,0,0,.12); }
.chat { margin-top: 16px; max-width: 720px; }
.messages { border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 10px; min-height: 160px; }
.input { display:flex; gap:10px; margin-top:10px; }
input { flex:1; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background: transparent; color: inherit; }
</style>