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
            <span class="s">{{ modeLabel }} • {{ liveId }}</span>
          </div>

          <div class="pill tinyPill">👀 {{ viewerCount }} watching</div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMute">
            {{ muted ? "🔇 Muted" : "🎙️ Mic" }}
          </button>

          <button v-if="mode === 'host'" class="chip ghost" @click="toggleCamera">
            {{ cameraOff ? "📷 Off" : "📹 Cam" }}
          </button>

          <!-- Viewer mic request -->
          <button
            v-if="mode === 'watch'"
            class="chip ghost"
            :disabled="micRequestPending || canSpeak"
            @click="requestMic"
            title="Ask host to allow you to speak"
          >
            {{ canSpeak ? "✅ Mic Allowed" : (micRequestPending ? "⏳ Requested" : "🎙️ Request Mic") }}
          </button>

          <button class="chip ghost" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Chat" }}</button>

          <button class="chip ghost" @click="hardReconnect">♻️ Reconnect</button>

          <button class="chip danger" @click="endLive">
            {{ mode === "host" ? "End Live" : "Leave" }}
          </button>
        </div>
      </header>

      <main class="stage">
        <section class="playerCard">
          <div class="playerTop">
            <div class="title">🔴 AddisGo Live</div>

            <div class="meta">
              <span class="tag">{{ mode === "host" ? "HOSTING" : "WATCHING" }}</span>
              <span class="small muted">{{ statusLabel }}</span>
              <span v-if="canSpeak" class="tag speakTag">🎙️ You can speak</span>
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

          <!-- Host mic requests panel -->
          <div v-if="mode === 'host' && micRequests.length" class="micPanel">
            <div class="micTitle">🎙️ Mic Requests</div>

            <div class="micReq" v-for="r in micRequests" :key="r.fromUserId">
              <div class="micReqLeft">
                <div class="micReqName">{{ r.fromName || ("User #" + r.fromUserId) }}</div>
                <div class="micReqSub">ID {{ r.fromUserId }}</div>
              </div>

              <div class="micReqActions">
                <button class="chip mini ghost" @click="denyMic(r.fromUserId)">Deny</button>
                <button class="chip mini" @click="approveMic(r.fromUserId)">Approve</button>
              </div>
            </div>
          </div>

          <!-- Speakers list -->
          <div v-if="speakerUserIds.length" class="micPanel">
            <div class="micTitle">🎧 Speakers</div>
            <div class="speakers">
              <span class="speaker" v-for="id in speakerUserIds" :key="id">🎙️ {{ id }}</span>
            </div>
          </div>

          <div class="chatBody" ref="chatBoxRef">
            <div v-for="(m, i) in messages" :key="i" class="msg">
              <div class="msgTop">
                <span class="who">{{ m.from?.username || m.from || "user" }}</span>
                <span class="time">{{ m.at ? formatDate(m.at) : (m.created_at ? formatDate(m.created_at) : "") }}</span>
              </div>
              <div class="text">{{ m.message || m.text }}</div>
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

const apiUrl = import.meta.env.VITE_API_URL;
const route = useRoute();
const router = useRouter();

const mode = String(route.query.mode || "watch"); // host | watch
const liveId = String(route.query.liveId || "");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const modeLabel = computed(() => (mode === "host" ? "HOST" : "WATCH"));

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

// watch: single pc
let watchPc = null;

const muted = ref(false);
const cameraOff = ref(false);

const chatOpen = ref(true);
const chatText = ref("");
const messages = ref([]);
const chatBoxRef = ref(null);

const viewerCount = ref(0);

/* mic request */
const canSpeak = ref(false);
const micRequestPending = ref(false);
const micRequests = ref([]); // host only
const speakerUserIds = ref([]);

function formatDate(d) {
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
   Media (host)
========================= */
async function getHostMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });
    videoEl.value.srcObject = localStream;
    await videoEl.value.play().catch(() => {});
    setMicEnabled(!muted.value);
    setCamEnabled(!cameraOff.value);
  } catch {
    error.value = "Camera/Mic blocked. Allow permissions then retry.";
    overlayTip.value = "Allow Camera & Microphone permissions to host live.";
  }
}

/* =========================
   WebRTC (relay events)
   Uses: webrtc:offer, webrtc:answer, webrtc:ice
========================= */
async function makePC() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
}

/* HOST: viewer joined -> create offer */
async function hostCreateOffer(viewerSocketId) {
  if (!localStream) return;
  const pc = await makePC();
  peers.set(viewerSocketId, pc);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit("webrtc:ice", { liveId, to: viewerSocketId, candidate: e.candidate });
  };

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "failed" || st === "closed" || st === "disconnected") {
      try { pc.close(); } catch {}
      peers.delete(viewerSocketId);
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket?.emit("webrtc:offer", { liveId, to: viewerSocketId, offer });
}

/* HOST: receive answer */
async function hostAcceptAnswer(fromSocketId, answer) {
  const pc = peers.get(fromSocketId);
  if (!pc || !answer) return;
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

/* HOST: add ICE */
async function hostAddIce(fromSocketId, candidate) {
  const pc = peers.get(fromSocketId);
  if (!pc || !candidate) return;
  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
}

/* WATCH: setup pc */
async function watchSetupPC() {
  watchPc = await makePC();

  watchPc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream) {
      videoEl.value.srcObject = stream;
      videoEl.value.play().catch(() => {});
      status.value = "live";
    }
  };

  watchPc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit("webrtc:ice", { liveId, candidate: e.candidate });
  };

  watchPc.onconnectionstatechange = () => {
    const st = watchPc?.connectionState;
    if (st === "failed") overlayTip.value = "Connection failed. Tap Reconnect.";
  };
}

async function watchHandleOffer(offer) {
  if (!watchPc) await watchSetupPC();
  await watchPc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await watchPc.createAnswer();
  await watchPc.setLocalDescription(answer);
  socket?.emit("webrtc:answer", { liveId, answer });
}

async function watchAddIce(candidate) {
  try {
    if (watchPc && candidate) await watchPc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

/* =========================
   Chat
========================= */
function sendMessage() {
  const text = chatText.value.trim();
  if (!text) return;
  socket?.emit("live:chat", { liveId, message: text });
  chatText.value = "";
}

/* =========================
   Mic request
========================= */
function requestMic() {
  if (!socket) return;
  micRequestPending.value = true;
  socket.emit("live:mic:request", { liveId });
  overlayTip.value = "Mic request sent to host.";
}

function approveMic(userId) {
  socket?.emit("live:mic:approve", { liveId, userId });
  micRequests.value = micRequests.value.filter((r) => String(r.fromUserId) !== String(userId));
}

function denyMic(userId) {
  socket?.emit("live:mic:deny", { liveId, userId });
  micRequests.value = micRequests.value.filter((r) => String(r.fromUserId) !== String(userId));
}

/* =========================
   Lifecycle
========================= */
function endLive() {
  status.value = "ended";
  if (mode === "host") socket?.emit("live:end", { liveId });
  else socket?.emit("live:leave", { liveId });
  cleanup();
  router.push("/dashboard");
}

function cleanup() {
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

function hardReconnect() {
  overlayTip.value = "Reconnecting…";
  cleanup();
  init();
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

function init() {
  if (!liveId) {
    error.value = "Missing liveId";
    return;
  }

  error.value = "";
  overlayTip.value = "";
  status.value = "connecting";

  socket = buildSocket();

  socket.on("connect", async () => {
    // keeps your global presence reliable (also helps calls)
    if (me?.id) socket.emit("user:online", { userId: me.id, username: me.username });

    if (mode === "host") {
      // ✅ critical: live gets created ONLY here
      socket.emit("live:create", { liveId });
      await getHostMedia();
      status.value = "live";
    } else {
      socket.emit("live:join", { liveId });
      await watchSetupPC();
      status.value = "connecting";
    }
  });

  socket.on("disconnect", () => {
    status.value = "connecting";
  });

  socket.on("live:presence", ({ viewerCount: n } = {}) => {
    viewerCount.value = Number(n || 0);
  });

  // host: when viewer joins, server provides socket id
  socket.on("live:viewer-joined", async ({ viewerSocketId } = {}) => {
    if (mode !== "host") return;
    if (!viewerSocketId) return;
    await hostCreateOffer(viewerSocketId);
  });

  socket.on("live:viewer-left", ({ viewerSocketId } = {}) => {
    if (mode !== "host") return;
    const pc = peers.get(viewerSocketId);
    if (pc) {
      try { pc.close(); } catch {}
      peers.delete(viewerSocketId);
    }
  });

  // watch receives offer
  socket.on("webrtc:offer", async ({ offer } = {}) => {
    if (mode !== "watch") return;
    if (offer) await watchHandleOffer(offer);
  });

  // host receives answer
  socket.on("webrtc:answer", async ({ answer, from } = {}) => {
    if (mode !== "host") return;
    if (from && answer) await hostAcceptAnswer(from, answer);
  });

  // ice both
  socket.on("webrtc:ice", async ({ candidate, from } = {}) => {
    if (!candidate) return;
    if (mode === "host") await hostAddIce(from, candidate);
    else await watchAddIce(candidate);
  });

  socket.on("live:ended", ({ liveId: endedId } = {}) => {
    if (String(endedId) === String(liveId)) {
      overlayTip.value = "Live ended.";
      status.value = "ended";
      setTimeout(() => endLive(), 400);
    }
  });

  socket.on("live:chat", async (msg) => {
    if (!msg) return;
    messages.value.push(msg);
    await nextTick();
    scrollChat();
  });

  // mic events
  socket.on("live:mic:status", ({ canSpeak: cs } = {}) => {
    canSpeak.value = !!cs;
    if (canSpeak.value) micRequestPending.value = false;
  });

  socket.on("live:mic:speakers", ({ speakerUserIds: ids } = {}) => {
    speakerUserIds.value = Array.isArray(ids) ? ids.map(String) : [];
  });

  socket.on("live:mic:requested", (payload) => {
    if (mode !== "host" || !payload?.fromUserId) return;
    const uid = String(payload.fromUserId);
    const exists = micRequests.value.some((r) => String(r.fromUserId) === uid);
    if (!exists) micRequests.value = [payload, ...micRequests.value].slice(0, 40);
  });

  socket.on("live:mic:requested:ack", () => {
    micRequestPending.value = true;
  });
  socket.on("live:mic:approved", () => {
    micRequestPending.value = false;
    canSpeak.value = true;
    overlayTip.value = "✅ Host approved your mic.";
  });
  socket.on("live:mic:denied", () => {
    micRequestPending.value = false;
    canSpeak.value = false;
    overlayTip.value = "❌ Host denied your mic request.";
  });
}

onMounted(() => init());
onBeforeUnmount(() => cleanup());
</script>

<style scoped>
/* NEW tiny additions */
.speakTag{
  background: rgba(34,197,94,.16);
  border: 1px solid rgba(34,197,94,.30);
}
.tinyPill{
  padding: 8px 10px;
  font-size: 12px;
  opacity: .9;
}
.micPanel{
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(0,0,0,.28);
  border: 1px solid rgba(255,255,255,.10);
}
.micTitle{ font-weight: 950; margin-bottom: 8px; }
.micReq{
  display:flex; justify-content:space-between; gap:10px; align-items:center;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  margin-bottom: 8px;
}
.micReqName{ font-weight: 950; }
.micReqSub{ opacity:.75; font-size: 12px; margin-top: 2px; }
.micReqActions{ display:flex; gap:8px; }
.speakers{ display:flex; gap:8px; flex-wrap: wrap; }
.speaker{
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  font-weight: 900;
  font-size: 12px;
}

/* ORIGINAL styling */
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