<template>
  <div class="live-page">
    <div class="topbar">
      <button class="back" @click="leaveLive">← Back</button>

      <div class="meta">
        <div class="title">Live</div>
        <div class="sub">{{ modeLabel }} • {{ liveId }}</div>
      </div>

      <div class="right">
        <span class="pill">{{ viewerCount }} viewers</span>
      </div>
    </div>

    <div class="stage">
      <video
        v-if="isHost"
        ref="localVideo"
        autoplay
        playsinline
        muted
        class="main-video"
      ></video>

      <video
        v-else
        ref="remoteVideo"
        autoplay
        playsinline
        webkit-playsinline
        class="main-video"
      />
    </div>

    <div class="controls">
      <button v-if="!isHost" class="btn" @click="requestMic">
        Request Mic
      </button>

      <button v-if="isHost" class="btn danger" @click="endLive">
        End Live
      </button>
    </div>

    <div v-if="isHost && micRequests.length" class="host-panel">
      <div class="panel-title">Mic requests</div>

      <div
        v-for="req in micRequests"
        :key="req.fromUserId"
        class="req-row"
      >
        <span>{{ req.fromName }}</span>
        <div class="row-actions">
          <button @click="approveMic(req)">Approve</button>
          <button class="danger" @click="denyMic(req)">Deny</button>
        </div>
      </div>
    </div>

    <div class="chat">
      <div class="messages">
        <div v-for="(msg, i) in chat" :key="i" class="msg">
          <strong>{{ msg.from?.username || "Anon" }}:</strong> {{ msg.message }}
        </div>
      </div>

      <form class="composer" @submit.prevent="sendChat">
        <input v-model="chatText" placeholder="Say something..." />
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import socket, { refreshSocketAuth } from "../socket";

const route = useRoute();
const router = useRouter();

const liveId = String(route.query.liveId || `live-${Date.now()}`);
const mode = String(route.query.mode || "viewer");

const isHost = mode === "host";
const modeLabel = isHost ? "Hosting" : "Watching";

const localVideo = ref(null);
const remoteVideo = ref(null);

const viewerCount = ref(0);
const chat = ref([]);
const chatText = ref("");
const micRequests = ref([]);
const canSpeak = ref(false);

let pc = null;
let localStream = null;
let remoteStream = null;
let hostSocketId = null;

async function getIceServers() {
  try {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const res = await fetch(`${base}/api/turn`);
    const data = await res.json();
    return data?.iceServers?.length
      ? data.iceServers
      : [{ urls: "stun:stun.l.google.com:19302" }];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

async function ensurePeer() {
  if (pc) return pc;

  pc = new RTCPeerConnection({
    iceServers: await getIceServers(),
  });

  // ✅ always create fresh stream
  remoteStream = new MediaStream();

  if (remoteVideo.value) {
    remoteVideo.value.srcObject = remoteStream;
  }

  // 🔥 FIXED ontrack (THIS WAS YOUR ISSUE)
  pc.ontrack = (event) => {
    console.log("📡 TRACK:", event.track.kind);

    // use direct track (not streams[0])
    remoteStream.addTrack(event.track);

    // force attach every time (important for mobile)
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = remoteStream;

      remoteVideo.value.play().catch((e) => {
        console.log("⚠️ autoplay blocked", e);
      });
    }
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate || !hostSocketId) return;

    socket.emit("webrtc:ice", {
      liveId,
      to: hostSocketId,
      candidate: event.candidate,
    });
  };

  return pc;
}

async function createHostStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (localVideo.value) {
    localVideo.value.srcObject = localStream;
  }
}

async function connectViewerToHost() {
  if (!hostSocketId) return;

  const peer = await ensurePeer();

  let stream = null;

  if (canSpeak.value) {
  stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });

  localStream = stream;

  stream.getTracks().forEach((track) => {
    peer.addTrack(track, stream);
  });
}

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit("webrtc:offer", {
    liveId,
    to: hostSocketId,
    offer,
  });
}

function sendChat() {
  const value = chatText.value.trim();
  if (!value) return;

  socket.emit("live:chat", {
    liveId,
    message: value,
  });

  chatText.value = "";
}

function requestMic() {
  socket.emit("live:mic:request", { liveId });
}

function approveMic(req) {
  socket.emit("live:mic:approve", {
    liveId,
    userId: req.fromUserId,
  });

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  );
}

function denyMic(req) {
  socket.emit("live:mic:deny", {
    liveId,
    userId: req.fromUserId,
    reason: "Host denied request",
  });

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  );
}

function leaveLive() {
  socket.emit("live:leave", { liveId });
  cleanup();
  router.back();
}

function endLive() {
  socket.emit("live:end", { liveId });
  cleanup();
  router.back();
}

function cleanup() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }
}

async function onLiveHost(payload) {
  hostSocketId = payload?.hostSocketId || null;

  if (!isHost && hostSocketId) {
    await connectViewerToHost();
  }
}

function onLivePresence(payload) {
  viewerCount.value = Number(payload?.viewerCount || 0);
}

function onLiveChat(payload) {
  chat.value.push(payload);
}

function onMicRequested(payload) {
  if (!isHost) return;
  micRequests.value.unshift(payload);
}

function onMicStatus(payload) {
  canSpeak.value = !!payload?.canSpeak;
}

async function onOffer({ offer, from }) {
  if (!isHost) return;

  hostSocketId = from;
  const peer = await ensurePeer();

  if (!localStream) {
    await createHostStream();
  }

  // ✅ ALWAYS add tracks (no condition)
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });

  await peer.setRemoteDescription(offer);

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("webrtc:answer", {
    liveId,
    to: from,
    answer,
  });
}

async function onAnswer({ answer }) {
  if (!pc) return;
  await pc.setRemoteDescription(answer);
}

async function onIce({ candidate }) {
  if (!pc || !candidate) return;
  await pc.addIceCandidate(candidate);
}

function onLiveEnded() {
  cleanup();
  router.back();
}

onMounted(async () => {
  refreshSocketAuth();

  socket.on("live:host", onLiveHost);
  socket.on("live:presence", onLivePresence);
  socket.on("live:chat", onLiveChat);
  socket.on("live:mic:requested", onMicRequested);
  socket.on("live:mic:status", onMicStatus);
  socket.on("webrtc:offer", onOffer);
  socket.on("webrtc:answer", onAnswer);
  socket.on("webrtc:ice", onIce);
  socket.on("live:ended", onLiveEnded);

  if (isHost) {
    await createHostStream();

    setTimeout(() => {
      socket.emit("live:create", { liveId });
    }, 100);

  } else {
    // ✅ THIS WAS MISSING
    socket.emit("live:join", { liveId });
  }
});

onBeforeUnmount(() => {
  socket.off("live:host", onLiveHost);
  socket.off("live:presence", onLivePresence);
  socket.off("live:chat", onLiveChat);
  socket.off("live:mic:requested", onMicRequested);
  socket.off("live:mic:status", onMicStatus);
  socket.off("webrtc:offer", onOffer);
  socket.off("webrtc:answer", onAnswer);
  socket.off("webrtc:ice", onIce);
  socket.off("live:ended", onLiveEnded);

  cleanup();
});
</script>

<style scoped>
.live-page {
  min-height: 100vh;
  background: #08111d;
  color: white;
  padding: 14px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.back, .btn, .row-actions button {
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
}
.title { font-weight: 900; }
.sub { opacity: 0.75; }
.pill {
  background: rgba(255,255,255,0.1);
  padding: 10px 12px;
  border-radius: 999px;
}
.stage {
  margin-top: 14px;
  border-radius: 24px;
  overflow: hidden;
  background: #000;
}
.main-video {
  width: 100%;
  min-height: 52vh;
  object-fit: cover;
}
.controls {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}
.btn { background: white; }
.btn.danger, .danger { background: #ef4444; color: white; }
.host-panel, .chat {
  margin-top: 14px;
  border-radius: 22px;
  padding: 14px;
  background: rgba(255,255,255,0.06);
}
.panel-title { font-weight: 800; margin-bottom: 10px; }
.req-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
}
.row-actions {
  display: flex;
  gap: 8px;
}
.messages {
  max-height: 220px;
  overflow: auto;
}
.msg {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.composer {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.composer input {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 12px;
}
.composer button {
  border: none;
  border-radius: 14px;
  padding: 0 16px;
  background: #22c55e;
  color: white;
}
</style>