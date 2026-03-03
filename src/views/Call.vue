<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="wrap">
      <div class="bg" aria-hidden="true"></div>

      <header class="topbar">
        <div class="left">
          <div class="pill">
            <span class="t">{{ kindLabel }} CALL</span>
            <span class="s">{{ statusLabel }}</span>
          </div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMute">{{ muted ? "🔇 Muted" : "🎙️ Mic" }}</button>
          <button v-if="kind === 'video'" class="chip ghost" @click="toggleCamera">
            {{ cameraOff ? "📷 Off" : "📹 Cam" }}
          </button>
          <button class="chip ghost" @click="hardReconnect">♻️ Reconnect</button>
          <button class="chip danger" @click="endCall">End</button>
        </div>
      </header>

      <main class="stage">
        <section class="card">
          <div class="cardTop">
            <div class="title">REMOTE</div>
            <div class="small muted">{{ remoteLabel }}</div>
          </div>

          <div class="videoBox">
            <video ref="remoteVideo" class="vid" autoplay playsinline></video>
            <div v-if="remoteWaiting" class="overlay">Waiting…</div>
          </div>
        </section>

        <section class="card">
          <div class="cardTop">
            <div class="title">YOU</div>
            <div class="small muted">{{ meLabel }}</div>
          </div>

          <div class="videoBox">
            <video ref="localVideo" class="vid" autoplay playsinline muted></video>
            <div v-if="localWaiting" class="overlay">Starting camera…</div>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>
          <div class="hint">Tip: If it gets stuck, tap <b>Reconnect</b> on both devices.</div>
        </section>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "video");  // video | audio

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const kindLabel = computed(() => (kind === "video" ? "VIDEO" : "AUDIO"));
const meLabel = computed(() => me?.username || "me");
const remoteLabel = computed(() => (role === "caller" ? "Waiting for callee…" : "Waiting for caller…"));

const status = ref("connecting"); // connecting | ready | in-call | ended
const statusLabel = computed(() => {
  if (status.value === "in-call") return "Connected";
  if (status.value === "ready") return "Ready";
  if (status.value === "ended") return "Ended";
  return "Connecting…";
});

const error = ref("");

const localVideo = ref(null);
const remoteVideo = ref(null);

const localWaiting = ref(true);
const remoteWaiting = ref(true);

const muted = ref(false);
const cameraOff = ref(false);

let socket = null;
let pc = null;
let localStream = null;
let makingOffer = false;
let polite = true; // glare-handling helper

function safeStopTracks(stream) {
  try { stream?.getTracks?.().forEach((t) => t.stop()); } catch {}
}

function setMicEnabled(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
}

function setCamEnabled(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
}

function toggleMute() {
  muted.value = !muted.value;
  setMicEnabled(!muted.value);
}

function toggleCamera() {
  cameraOff.value = !cameraOff.value;
  setCamEnabled(!cameraOff.value);
}

function emitSignal(type, payload = {}) {
  if (!socket) return;

  // send multiple formats to match whatever server expects
  socket.emit("call:signal", { roomId, type, ...payload });
  if (type === "offer") socket.emit("call:offer", { roomId, sdp: payload.sdp });
  if (type === "answer") socket.emit("call:answer", { roomId, sdp: payload.sdp });
  if (type === "ice") socket.emit("call:ice", { roomId, candidate: payload.candidate });
}

async function getLocalMedia() {
  error.value = "";
  localWaiting.value = true;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video" ? { facingMode: "user" } : false,
    });

    if (localVideo.value) {
      localVideo.value.srcObject = localStream;
      await localVideo.value.play().catch(() => {});
    }

    setMicEnabled(!muted.value);
    setCamEnabled(!cameraOff.value);

    localWaiting.value = false;
  } catch (e) {
    localWaiting.value = false;
    error.value = "Camera/Mic blocked. Allow permissions then Reconnect.";
  }
}

function makePC() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // add tracks
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  pc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream && remoteVideo.value) {
      remoteVideo.value.srcObject = stream;
      remoteVideo.value.play().catch(() => {});
      remoteWaiting.value = false;
      status.value = "in-call";
    }
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) emitSignal("ice", { candidate: e.candidate });
  };

  // Perfect negotiation (handles glare)
  pc.onnegotiationneeded = async () => {
    if (role !== "caller") return; // caller drives negotiation
    try {
      makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);
      emitSignal("offer", { sdp: pc.localDescription });
    } catch {}
    finally {
      makingOffer = false;
    }
  };

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "connected") status.value = "in-call";
    if (st === "failed") {
      status.value = "connecting";
      error.value = "Connection failed. Tap Reconnect on both devices.";
    }
  };

  return pc;
}

async function handleOffer(sdp) {
  if (!pc) return;
  const offerCollision = (sdp && (makingOffer || pc.signalingState !== "stable"));
  polite = role === "callee"; // callee is polite

  if (offerCollision && !polite) return;

  try {
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitSignal("answer", { sdp: pc.localDescription });
    status.value = "ready";
  } catch {}
}

async function handleAnswer(sdp) {
  if (!pc) return;
  try {
    await pc.setRemoteDescription(sdp);
    status.value = "ready";
  } catch {}
}

async function handleIce(candidate) {
  if (!pc || !candidate) return;
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
}

function joinRoom() {
  if (!socket) return;

  // try multiple join styles (safe)
  socket.emit("call:join", { roomId, role, kind });
  socket.emit("call:ready", { roomId, role, kind });
  socket.emit("call:room:join", { roomId, role, kind });
}

function buildSocket() {
  return io(apiUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 15000,
  });
}

async function init() {
  if (!roomId) {
    error.value = "Missing roomId";
    return;
  }

  error.value = "";
  status.value = "connecting";
  remoteWaiting.value = true;

  await getLocalMedia();

  socket = buildSocket();

  socket.on("connect", () => {
    // keep your global presence stable
    if (me?.id) socket.emit("user:online", { userId: me.id, username: me.username });

    joinRoom();
    status.value = "ready";

    // create PC after socket connects (clean)
    if (pc) { try { pc.close(); } catch {} }
    pc = makePC();

    // Caller: force negotiation in case onnegotiationneeded doesn’t fire on some browsers
    if (role === "caller") {
      setTimeout(async () => {
        try {
          if (!pc) return;
          if (pc.signalingState !== "stable") return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emitSignal("offer", { sdp: pc.localDescription });
        } catch {}
      }, 350);
    }
  });

  socket.on("disconnect", () => {
    status.value = "connecting";
  });

  // Accept multiple signaling styles
  socket.on("call:signal", async (p = {}) => {
    if (!p || String(p.roomId || "") !== roomId) return;
    if (p.type === "offer" && p.sdp) await handleOffer(p.sdp);
    if (p.type === "answer" && p.sdp) await handleAnswer(p.sdp);
    if (p.type === "ice" && p.candidate) await handleIce(p.candidate);
  });

  socket.on("call:offer", async (p = {}) => {
    if (String(p.roomId || "") !== roomId) return;
    if (p.sdp) await handleOffer(p.sdp);
  });

  socket.on("call:answer", async (p = {}) => {
    if (String(p.roomId || "") !== roomId) return;
    if (p.sdp) await handleAnswer(p.sdp);
  });

  socket.on("call:ice", async (p = {}) => {
    if (String(p.roomId || "") !== roomId) return;
    if (p.candidate) await handleIce(p.candidate);
  });

  socket.on("call:ended", () => {
    endCall(true);
  });

  socket.on("call:error", ({ message } = {}) => {
    error.value = message || "Call error";
  });
}

function cleanup() {
  try { socket?.emit("call:leave", { roomId }); } catch {}
  try { socket?.disconnect(); } catch {}
  socket = null;

  try { pc?.close(); } catch {}
  pc = null;

  safeStopTracks(localStream);
  localStream = null;
}

function hardReconnect() {
  cleanup();
  init();
}

function endCall(fromRemote = false) {
  status.value = "ended";
  if (!fromRemote) {
    try { socket?.emit("call:end", { roomId }); } catch {}
    try { socket?.emit("call:ended", { roomId }); } catch {}
  }
  cleanup();
  router.push("/dashboard");
}

onMounted(() => init());
onBeforeUnmount(() => cleanup());
</script>

<style scoped>
.wrap{
  min-height: 100vh;
  color: #fff;
  position: relative;
  overflow:hidden;
}
.bg{
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events:none;
  background:
    radial-gradient(900px 650px at 20% 10%, rgba(255, 75, 43, 0.18), transparent 60%),
    radial-gradient(850px 650px at 80% 20%, rgba(255, 65, 108, 0.16), transparent 60%),
    radial-gradient(950px 700px at 50% 110%, rgba(124, 58, 237, 0.14), transparent 60%),
    linear-gradient(180deg, #0b1220, #070b14);
  filter: saturate(115%) contrast(105%);
}
.wrap > *{ position: relative; z-index: 1; }

.topbar{
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 14px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.left{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; }
.right{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

.pill{
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}
.t{ font-weight: 950; letter-spacing:.3px; }
.s{ opacity:.75; font-size: 12px; }

.chip{
  border:none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor:pointer;
  background: rgba(255,255,255,.12);
  color:#fff;
  font-weight: 900;
}
.chip.ghost{ background: rgba(255,255,255,.10); }
.chip.danger{ background: rgba(255,80,80,.20); border:1px solid rgba(255,80,80,.35); }

.stage{
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items:start;
}
.card{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
}
.cardTop{
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.title{ font-weight: 950; }
.small{ font-size: 12px; }
.muted{ opacity:.75; }

.videoBox{
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.10);
  min-height: 340px;
}
.vid{
  width: 100%;
  height: 100%;
  display:block;
  object-fit: cover;
  background:#000;
}
.overlay{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  background: rgba(0,0,0,.35);
  font-weight: 950;
  letter-spacing:.3px;
}

.alert{
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,.18);
  border: 1px solid rgba(255,80,80,.35);
}
.hint{
  margin-top: 10px;
  opacity: .8;
  font-size: 12px;
}

@media (max-width: 980px){
  .stage{ grid-template-columns: 1fr; }
  .videoBox{ min-height: 260px; }
}
</style>