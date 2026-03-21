<!-- src/views/Live.vue -->
<template>
  <Layout>
    <div class="liveWrap">
      <div class="bg-animated" aria-hidden="true"></div>

      <header class="topbar">
        <div class="left">
          <button class="chip ghost" @click="goBack">← Back</button>
          <div class="pill">
            <span class="dot on"></span>
            <span class="t">LIVE</span>
            <span class="s">{{ mode.toUpperCase() }} • {{ liveId }}</span>
          </div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMute">{{ muted ? "🔇 Muted" : "🎙️ Mic" }}</button>
          <button v-if="mode === 'host'" class="chip ghost" @click="toggleCamera">
            {{ cameraOff ? "📷 Off" : "📹 Cam" }}
          </button>
          <button class="chip ghost" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Chat" }}</button>
          <button class="chip danger" @click="endLive">{{ mode === "host" ? "End Live" : "Leave" }}</button>
        </div>
      </header>

      <main class="stage">
        <section class="playerCard">
          <div class="playerTop">
            <div class="title">🔴 Pulse Live</div>
            <div class="meta">
              <span class="tag">{{ mode === "host" ? "HOSTING" : "WATCHING" }}</span>
              <span class="small muted">{{ statusLabel }}</span>
            </div>

            <div class="actions">
              <button class="chip ghost mini" @click="toggleFullscreen">⛶ Fullscreen</button>
            </div>
          </div>

          <div class="videoWrap">
            <video ref="videoEl" class="video" autoplay playsinline :muted="mode === 'host'"></video>

            <div v-if="overlayTip" class="overlayTip">
              {{ overlayTip }}
              <button class="chip mini ghost" @click="overlayTip = ''">OK</button>
            </div>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>
        </section>

        <aside class="chat" :class="{ open: chatOpen }">
          <div class="chatHead">
            <div class="chatTitle">💬 Live Chat</div>
            <button class="chip mini ghost" @click="toggleChat">✕</button>
          </div>

          <div class="chatBody" ref="chatBoxRef">
            <div v-for="(m, i) in messages" :key="i" class="msg">
              <div class="msgTop">
                <span class="who">{{ m.fromName }}</span>
                <span class="time">{{ m.timeLabel }}</span>
              </div>
              <div class="text">{{ m.text }}</div>
            </div>
          </div>

          <div class="chatInput">
            <input v-model="chatText" placeholder="Say something…" @keydown.enter.prevent="sendMessage" />
            <button class="chip" @click="sendMessage">Send</button>
          </div>
        </aside>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

const route = useRoute();
const router = useRouter();

const mode = String(route.query.mode || "watch"); // host | watch
const liveId = String(route.query.liveId || "");

const token = localStorage.getItem("token") || "";
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const status = ref("connecting"); // connecting | live | ended
const statusLabel = computed(() => {
  if (status.value === "live") return "Streaming";
  if (status.value === "ended") return "Ended";
  return "Connecting…";
});

const error = ref("");
const overlayTip = ref("");
const videoEl = ref(null);

let socket = null;
let localStream = null;

// host: watcherSocketId -> pc
const peers = new Map();

// watch: single pc + host socket id
let watchPc = null;
let hostSocketId = null;

const muted = ref(false);
const cameraOff = ref(false);

const chatOpen = ref(true);
const chatText = ref("");
const messages = ref([]);
const chatBoxRef = ref(null);

function formatTime(d) {
  try {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString();
  } catch {
    return "";
  }
}

function scrollChat() {
  const el = chatBoxRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function toggleChat() {
  chatOpen.value = !chatOpen.value;
}

function goBack() {
  router.push("/dashboard");
}

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

async function toggleFullscreen() {
  const el = videoEl.value;
  if (!el) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  } catch {}
}

/* =========================
   ✅ ICE servers (TURN if available)
========================= */
async function getIceServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`);
    const data = await res.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) return data.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

let cachedIce = null;
async function makePC() {
  if (!cachedIce) cachedIce = await getIceServers();
  return new RTCPeerConnection({ iceServers: cachedIce });
}

/* =========================
   Media (host)
========================= */
async function getHostMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    if (videoEl.value) {
      videoEl.value.srcObject = localStream;
      await videoEl.value.play().catch(() => {});
    }

    setMicEnabled(!muted.value);
    setCamEnabled(!cameraOff.value);

    status.value = "live";
    error.value = "";
    overlayTip.value = "";
  } catch {
    error.value = "Camera/Mic blocked. Allow permissions then retry.";
    overlayTip.value = "Allow Camera & Microphone permissions to host live.";
    status.value = "connecting";
  }
}

/* =========================
   WebRTC - HOST
========================= */
async function hostCreatePeer(viewerSocketId) {
  if (!localStream) return;

  const pc = await makePC();
  peers.set(viewerSocketId, pc);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit("webrtc:ice", { liveId, to: viewerSocketId, candidate: e.candidate });
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket?.emit("webrtc:offer", { liveId, to: viewerSocketId, offer });
}

async function hostAcceptAnswer(fromSocketId, answer) {
  const pc = peers.get(fromSocketId);
  if (!pc || !answer) return;
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function hostAddIce(fromSocketId, candidate) {
  const pc = peers.get(fromSocketId);
  if (!pc || !candidate) return;
  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
}

function hostDropPeer(viewerSocketId) {
  const pc = peers.get(viewerSocketId);
  if (pc) {
    try { pc.close(); } catch {}
    peers.delete(viewerSocketId);
  }
}

/* =========================
   WebRTC - WATCHER
========================= */
async function watchEnsurePC() {
  if (watchPc) return;

  watchPc = await makePC();

  watchPc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream && videoEl.value) {
      videoEl.value.srcObject = stream;
      videoEl.value.play().catch(() => {});
      status.value = "live";
    }
  };

  watchPc.onicecandidate = (e) => {
    if (e.candidate && hostSocketId) {
      socket?.emit("webrtc:ice", { liveId, to: hostSocketId, candidate: e.candidate });
    }
  };
}

async function watchHandleOffer(from, offer) {
  if (!from || !offer) return;
  hostSocketId = String(from);

  await watchEnsurePC();
  await watchPc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await watchPc.createAnswer();
  await watchPc.setLocalDescription(answer);

  socket?.emit("webrtc:answer", { liveId, to: hostSocketId, answer });
  status.value = "connecting";
}

async function watchAddIce(candidate) {
  try {
    if (watchPc && candidate) await watchPc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

/* =========================
   Live Chat
========================= */
function pushChat(msg) {
  const fromName =
    msg?.from?.username ||
    msg?.fromName ||
    msg?.from ||
    "Anon";

  const text =
    msg?.message ||
    msg?.text ||
    "";

  const at =
    msg?.at ||
    msg?.created_at ||
    new Date().toISOString();

  messages.value.push({
    fromName,
    text,
    timeLabel: formatTime(at),
  });
}

function sendMessage() {
  const text = chatText.value.trim();
  if (!text) return;

  socket?.emit("live:chat", { liveId, message: text });
  chatText.value = "";
}

/* =========================
   End / Leave
========================= */
function endLive() {
  status.value = "ended";

  if (socket && liveId) {
    if (mode === "host") socket.emit("live:end", { liveId });
    else socket.emit("live:leave", { liveId });
  }

  cleanup();
  router.push("/dashboard");
}

/* =========================
   Init
========================= */
async function init() {
  if (!liveId) {
    error.value = "Missing liveId";
    return;
  }

  socket = io(apiUrl, {
    transports: ["websocket", "polling"],
    auth: token ? { token } : undefined,
  });

  socket.on("connect", async () => {
    // presence (stable identity)
    if (me?.id) socket.emit("user:online", { userId: me.id, username: me.username });

    if (mode === "host") {
      // ✅ Live page owns live:create (host socket is correct)
      socket.emit("live:create", { liveId });

      await getHostMedia();
      if (!localStream) {
        overlayTip.value = overlayTip.value || "Allow permissions then come back and tap Go Live again.";
        return;
      }
      status.value = "live";
    } else {
      socket.emit("live:join", { liveId });
      await watchEnsurePC();
      status.value = "connecting";
    }
  });

  socket.on("live:host", ({ hostSocketId: hid } = {}) => {
    if (mode === "watch" && hid) hostSocketId = String(hid);
  });

  socket.on("live:viewer-joined", async ({ viewerSocketId } = {}) => {
    if (mode !== "host") return;
    if (!viewerSocketId) return;
    await hostCreatePeer(String(viewerSocketId));
  });

  socket.on("live:viewer-left", ({ viewerSocketId } = {}) => {
    if (mode !== "host") return;
    if (!viewerSocketId) return;
    hostDropPeer(String(viewerSocketId));
  });

  socket.on("webrtc:offer", async ({ from, offer } = {}) => {
    if (mode !== "watch") return;
    if (offer) await watchHandleOffer(from, offer);
  });

  socket.on("webrtc:answer", async ({ from, answer } = {}) => {
    if (mode !== "host") return;
    if (from && answer) await hostAcceptAnswer(String(from), answer);
  });

  socket.on("webrtc:ice", async ({ from, candidate } = {}) => {
    if (!candidate) return;
    if (mode === "host") {
      if (from) await hostAddIce(String(from), candidate);
    } else {
      await watchAddIce(candidate);
    }
  });

  socket.on("live:ended", () => {
    status.value = "ended";
    overlayTip.value = "Live ended.";
    setTimeout(() => {
      cleanup();
      router.push("/dashboard");
    }, 600);
  });

  socket.on("live:chat", async (msg) => {
    if (!msg) return;
    pushChat(msg);
    await nextTick();
    scrollChat();
  });
}

function cleanup() {
  try {
    if (socket && liveId && mode !== "host") socket.emit("live:leave", { liveId });
  } catch {}

  try {
    peers.forEach((pc) => { try { pc.close(); } catch {} });
    peers.clear();
  } catch {}

  try { watchPc?.close(); } catch {}
  watchPc = null;

  safeStopTracks(localStream);
  localStream = null;

  try { socket?.disconnect(); } catch {}
  socket = null;
}

onMounted(() => init());
onBeforeUnmount(() => cleanup());
</script>

<style scoped>
/* (UNCHANGED: your exact CSS) */
.liveWrap{
  min-height: 100vh;
  padding-bottom: 18px;
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
.liveWrap > *:not(.bg-animated){ position: relative; z-index: 1; }

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
.dot{ width:10px; height:10px; border-radius:50%; background:#ff3b3b; box-shadow: 0 0 16px rgba(255,59,59,.5); }
.dot.on{ animation: pulse 1.6s infinite; }
@keyframes pulse{
  0%{ box-shadow:0 0 0 0 rgba(255,59,59,.55) }
  70%{ box-shadow:0 0 0 10px rgba(255,59,59,0) }
  100%{ box-shadow:0 0 0 0 rgba(255,59,59,0) }
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
.chip.mini{ padding: 8px 10px; font-size: 12px; }

.stage{
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  display:grid;
  grid-template-columns: 1fr 380px;
  gap: 14px;
  align-items:start;
}

.playerCard{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
}

.playerTop{
  display:flex;
  gap: 10px;
  justify-content:space-between;
  align-items:center;
  flex-wrap:wrap;
  margin-bottom: 10px;
}
.title{ font-weight: 950; }
.meta{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; }
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

.videoWrap{
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.10);
}
.video{
  width: 100%;
  height: auto;
  display:block;
  max-height: 76vh;
  object-fit: cover;
  background:#000;
}

.overlayTip{
  position:absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  align-items:center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  font-weight: 900;
}

.alert{
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,.18);
  border: 1px solid rgba(255,80,80,.35);
}

.chat{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
  display:flex;
  flex-direction: column;
  min-height: 520px;
}
.chatHead{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom: 10px;
}
.chatTitle{ font-weight: 950; }

.chatBody{
  flex: 1;
  overflow:auto;
  display:grid;
  gap: 10px;
  padding: 10px;
  background: rgba(0,0,0,.25);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
}
.msg{
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}
.msgTop{ display:flex; justify-content:space-between; gap: 10px; }
.who{ font-weight: 950; }
.time{ opacity:.7; font-size: 12px; }
.text{ margin-top: 6px; line-height: 1.45; }

.chatInput{
  display:flex;
  gap: 8px;
  margin-top: 10px;
}
.chatInput input{
  flex: 1;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}

@media (max-width: 980px){
  .stage{ grid-template-columns: 1fr; }
  .chat{ min-height: 420px; }
}
</style>