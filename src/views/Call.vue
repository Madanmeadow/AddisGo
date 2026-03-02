<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="callWrap">
      <div class="bg-animated" aria-hidden="true"></div>

      <header class="top">
        <div class="left">
          <div class="pill">
            <span class="dot" :class="{ on: status === 'connected' }"></span>
            <span class="t">{{ kind.toUpperCase() }} CALL</span>
            <span class="s">{{ statusLabel }}</span>
          </div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMute">
            {{ muted ? "🔇 Muted" : "🎙️ Mic" }}
          </button>
          <button v-if="kind === 'video'" class="chip ghost" @click="toggleCamera">
            {{ cameraOff ? "📷 Off" : "📹 Cam" }}
          </button>
          <button class="chip danger" @click="hangup">End</button>
        </div>
      </header>

      <main class="stage">
        <section class="videos" :class="{ audioOnly: kind !== 'video' }">
          <!-- Remote -->
          <div class="remoteCard">
            <div class="cardTop">
              <span class="tag">REMOTE</span>
              <span class="small muted">{{ remoteInfo }}</span>
            </div>

            <video
              v-if="kind === 'video'"
              ref="remoteVideo"
              class="remoteVideo"
              autoplay
              playsinline
            ></video>

            <div v-else class="audioOnlyBox">
              <div class="bigIcon">🎧</div>
              <div class="title">Audio Call</div>
              <div class="sub">Connected audio will play here.</div>
            </div>
          </div>

          <!-- Local -->
          <div class="localCard" :class="{ hidden: kind !== 'video' }">
            <div class="cardTop">
              <span class="tag">YOU</span>
              <span class="small muted">{{ meLabel }}</span>
            </div>

            <video
              v-if="kind === 'video'"
              ref="localVideo"
              class="localVideo"
              autoplay
              playsinline
              muted
            ></video>

            <div class="localBadges">
              <span class="mini" :class="{ on: !muted }">{{ muted ? "🔇" : "🎙️" }}</span>
              <span v-if="kind === 'video'" class="mini" :class="{ on: !cameraOff }">{{ cameraOff ? "📷" : "📹" }}</span>
            </div>
          </div>
        </section>

        <section v-if="error" class="alert">{{ error }}</section>

        <section class="hint">
          Tip: On iPhone, if video is black, ensure Safari camera permissions are allowed.
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

/* =========================
   🔧 CONFIG (ONLY CHANGE HERE if your server uses different event names)
========================= */
const EVT = {
  join: "call:join",          // client -> server { roomId, role }
  offer: "call:offer",        // client -> server { roomId, sdp }
  answer: "call:answer",      // client -> server { roomId, sdp }
  ice: "call:ice",            // client -> server { roomId, candidate }
  peerLeft: "call:peer-left", // server -> client { roomId }
  ready: "call:ready",        // server -> client { roomId } (optional)
};

const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "audio");  // audio | video

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const meLabel = computed(() => me?.username || "You");
const remoteInfo = computed(() => (status.value === "connected" ? "Connected" : "Waiting…"));

const status = ref("connecting"); // connecting | ready | connected | ended
const statusLabel = computed(() => {
  if (status.value === "connected") return "Connected";
  if (status.value === "ready") return "Ready";
  if (status.value === "ended") return "Ended";
  return "Connecting…";
});

const error = ref("");

const localVideo = ref(null);
const remoteVideo = ref(null);

let socket = null;
let pc = null;
let localStream = null;

const muted = ref(false);
const cameraOff = ref(false);

function safeStopTracks(stream) {
  try { stream?.getTracks?.().forEach((t) => t.stop()); } catch {}
}

function attachVideo(el, stream, mutedFlag = false) {
  if (!el) return;
  try {
    el.srcObject = stream;
    el.muted = !!mutedFlag;
    el.play?.().catch(() => {});
  } catch {}
}

function setMicEnabled(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
}

function setCamEnabled(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
}

/* =========================
   UI actions
========================= */
function toggleMute() {
  muted.value = !muted.value;
  setMicEnabled(!muted.value);
}

function toggleCamera() {
  cameraOff.value = !cameraOff.value;
  setCamEnabled(!cameraOff.value);
}

function hangup() {
  status.value = "ended";
  cleanup();
  router.push("/dashboard");
}

/* =========================
   WebRTC
========================= */
async function createPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit(EVT.ice, { roomId, candidate: e.candidate });
  };

  pc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream) {
      status.value = "connected";
      if (kind === "video") attachVideo(remoteVideo.value, stream, false);
    }
  };

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === "connected") status.value = "connected";
    if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
      // keep UI stable; user can end and re-call from dashboard
    }
  };

  // add local tracks
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
}

async function getMedia() {
  const wantVideo = kind === "video";
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantVideo ? { facingMode: "user" } : false,
    });
    if (wantVideo) attachVideo(localVideo.value, localStream, true);
    setMicEnabled(!muted.value);
    setCamEnabled(!cameraOff.value);
  } catch (e) {
    error.value = wantVideo
      ? "Camera/Mic blocked. Allow permissions in browser settings."
      : "Mic blocked. Allow microphone permissions.";
  }
}

/* Caller creates offer, Callee waits then answers */
async function startCallerFlow() {
  await createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit(EVT.offer, { roomId, sdp: offer });
}

async function handleOffer(sdp) {
  await createPeerConnection();
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit(EVT.answer, { roomId, sdp: answer });
}

async function handleAnswer(sdp) {
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

async function handleIce(candidate) {
  try {
    if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

/* =========================
   Socket init
========================= */
async function init() {
  if (!roomId) {
    error.value = "Missing roomId";
    return;
  }

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", async () => {
    status.value = "ready";
    socket.emit(EVT.join, { roomId, role, kind });
    await getMedia();

    // If your server does NOT emit EVT.ready, caller can start immediately
    if (role === "caller") {
      try {
        // small delay to let callee join
        setTimeout(() => startCallerFlow().catch(() => {}), 250);
      } catch {}
    }
  });

  // optional server "ready" to start offer after both joined
  socket.on(EVT.ready, () => {
    if (role === "caller") startCallerFlow().catch(() => {});
  });

  socket.on(EVT.offer, async ({ sdp } = {}) => {
    if (role === "callee" && sdp) await handleOffer(sdp);
  });

  socket.on(EVT.answer, async ({ sdp } = {}) => {
    if (role === "caller" && sdp) await handleAnswer(sdp);
  });

  socket.on(EVT.ice, async ({ candidate } = {}) => {
    if (candidate) await handleIce(candidate);
  });

  socket.on(EVT.peerLeft, () => {
    error.value = "Other user left the call.";
    status.value = "ended";
    cleanup();
  });
}

function cleanup() {
  try { pc?.close(); } catch {}
  pc = null;

  safeStopTracks(localStream);
  localStream = null;

  try { socket?.disconnect(); } catch {}
  socket = null;
}

onMounted(() => init());
onBeforeUnmount(() => cleanup());
</script>

<style scoped>
.callWrap {
  min-height: 100vh;
  padding-bottom: 20px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.bg-animated{
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(900px 650px at 20% 10%, rgba(255, 75, 43, 0.18), transparent 60%),
    radial-gradient(850px 650px at 80% 20%, rgba(255, 65, 108, 0.16), transparent 60%),
    radial-gradient(950px 700px at 50% 110%, rgba(124, 58, 237, 0.14), transparent 60%),
    radial-gradient(700px 520px at 10% 80%, rgba(34, 197, 94, 0.10), transparent 60%),
    linear-gradient(180deg, #0b1220, #070b14);
  filter: saturate(115%) contrast(105%);
  animation: bgFloat 14s ease-in-out infinite;
}
@keyframes bgFloat{
  0%{transform:translate3d(0,0,0) scale(1)}
  25%{transform:translate3d(-18px,-10px,0) scale(1.02)}
  50%{transform:translate3d(12px,-16px,0) scale(1.03)}
  75%{transform:translate3d(18px,8px,0) scale(1.02)}
  100%{transform:translate3d(0,0,0) scale(1)}
}
.callWrap > *:not(.bg-animated){ position: relative; z-index: 1; }

.top{
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 14px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.10);
}

.pill{
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}
.dot{ width:10px; height:10px; border-radius:50%; background: rgba(255,255,255,.35); }
.dot.on{ background:#00e676; box-shadow:0 0 16px rgba(0,230,118,.55); }
.t{ font-weight: 950; letter-spacing:.3px; }
.s{ opacity:.75; font-size: 12px; }

.right{ display:flex; gap: 10px; flex-wrap: wrap; justify-content:flex-end; }

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
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}

.videos{
  display:grid;
  grid-template-columns: 1fr 360px;
  gap: 14px;
  align-items: start;
}
.videos.audioOnly{ grid-template-columns: 1fr; }

.remoteCard, .localCard{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
}
.cardTop{
  display:flex;
  justify-content:space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.tag{
  font-weight: 950;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 12px;
}
.small{ font-size: 12px; }
.muted{ opacity:.75; }

.remoteVideo{
  width: 100%;
  height: auto;
  max-height: 72vh;
  object-fit: cover;
  border-radius: 16px;
  background: #000;
  border: 1px solid rgba(255,255,255,.10);
}
.localVideo{
  width: 100%;
  height: auto;
  max-height: 42vh;
  object-fit: cover;
  border-radius: 16px;
  background: #000;
  border: 1px solid rgba(255,255,255,.10);
}
.localCard.hidden{ display:none; }

.localBadges{
  margin-top: 10px;
  display:flex;
  gap: 8px;
}
.mini{
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.12);
  font-weight: 950;
  font-size: 12px;
  opacity: .8;
}
.mini.on{ opacity: 1; box-shadow: 0 0 18px rgba(255,75,43,.25); }

.audioOnlyBox{
  display:grid;
  place-items:center;
  padding: 30px 10px;
  border-radius: 16px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}
.bigIcon{ font-size: 44px; }
.title{ font-weight: 950; margin-top: 6px; }
.sub{ opacity:.75; margin-top: 4px; text-align:center; }

.alert{
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,.18);
  border: 1px solid rgba(255,80,80,.35);
}

.hint{
  margin-top: 12px;
  opacity: .75;
  font-size: 13px;
}

@media (max-width: 900px){
  .videos{ grid-template-columns: 1fr; }
}
</style>