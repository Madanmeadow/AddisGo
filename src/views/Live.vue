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
          <button v-if="mode === 'host'" class="chip ghost" @click="toggleCamera">{{ cameraOff ? "📷 Off" : "📹 Cam" }}</button>
          <button class="chip ghost" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Chat" }}</button>
          <button class="chip danger" @click="endLive">{{ mode === "host" ? "End Live" : "Leave" }}</button>
        </div>
      </header>

      <main class="stage">
        <section class="playerCard">
          <div class="playerTop">
            <div class="title">🔴 AddisGo Live</div>
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
                <span class="who">{{ m.from }}</span>
                <span class="time">{{ m.created_at ? formatDate(m.created_at) : "" }}</span>
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

/* =========================
   🔧 CONFIG (ONLY CHANGE HERE if your server uses different event names)
========================= */
const EVT = {
  join: "live:join",        // client -> server { liveId }
  leave: "live:leave",      // client -> server { liveId }
  watcher: "live:watcher",  // server -> host { watcherId }
  offer: "live:offer",      // host -> server { watcherId, liveId, sdp }
  answer: "live:answer",    // watcher -> server { liveId, sdp }
  ice: "live:ice",          // both -> server { liveId, candidate }
  hostSignal: "live:signal",// optional unified
  chat: "live:chat",        // both ways { liveId, from, text, created_at }
};

const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();

const mode = String(route.query.mode || "watch"); // host | watch
const liveId = String(route.query.liveId || "");

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

// host: many peer connections (watcherId -> pc)
const peers = new Map();

// watch: one peer connection
let watchPc = null;

const muted = ref(false);
const cameraOff = ref(false);

const chatOpen = ref(true);
const chatText = ref("");
const messages = ref([]);
const chatBoxRef = ref(null);

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
  } catch {
    // iOS Safari uses native fullscreen UI sometimes; ignore
  }
}

function endLive() {
  status.value = "ended";
  cleanup();
  router.push("/dashboard");
}

/* =========================
   Media
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
   WebRTC helpers
========================= */
function makePC() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
}

/* HOST: create offer per watcher */
async function hostCreateOfferForWatcher(watcherId) {
  if (!localStream) return;
  const pc = makePC();
  peers.set(watcherId, pc);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit(EVT.ice, { liveId, to: watcherId, candidate: e.candidate });
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket?.emit(EVT.offer, { liveId, to: watcherId, sdp: offer });
}

/* HOST: accept answer from watcher */
async function hostAcceptAnswer(fromWatcherId, sdp) {
  const pc = peers.get(fromWatcherId);
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

/* HOST: add ice from watcher */
async function hostAddIce(fromWatcherId, candidate) {
  const pc = peers.get(fromWatcherId);
  if (!pc || !candidate) return;
  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
}

/* WATCH: join + receive offer -> answer */
async function watchSetupPC() {
  watchPc = makePC();

  watchPc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream) {
      videoEl.value.srcObject = stream;
      videoEl.value.play().catch(() => {});
      status.value = "live";
    }
  };

  watchPc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit(EVT.ice, { liveId, candidate: e.candidate });
  };
}

async function watchHandleOffer(sdp) {
  if (!watchPc) await watchSetupPC();
  await watchPc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await watchPc.createAnswer();
  await watchPc.setLocalDescription(answer);
  socket?.emit(EVT.answer, { liveId, sdp: answer });
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
  const payload = { liveId, from: me?.username || "me", text, created_at: new Date().toISOString() };
  socket?.emit(EVT.chat, payload);
  chatText.value = "";
}

/* =========================
   Init
========================= */
async function init() {
  if (!liveId) {
    error.value = "Missing liveId";
    return;
  }

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", async () => {
    socket.emit(EVT.join, { liveId, mode });

    if (mode === "host") {
      await getHostMedia();
      status.value = "live";
    } else {
      await watchSetupPC();
      status.value = "connecting";
      // let server know we are a watcher (many servers do this automatically on join)
      socket.emit("watcher", { liveId }); // if your server doesn't use this, remove it
    }
  });

  // HOST: server tells host a watcher joined
  socket.on(EVT.watcher, async ({ watcherId } = {}) => {
    if (mode !== "host") return;
    if (!watcherId) return;
    await hostCreateOfferForWatcher(watcherId);
  });

  // WATCH: receive offer
  socket.on(EVT.offer, async ({ sdp } = {}) => {
    if (mode !== "watch") return;
    if (sdp) await watchHandleOffer(sdp);
  });

  // HOST: receive answer from watcher
  socket.on(EVT.answer, async ({ from, watcherId, sdp } = {}) => {
    if (mode !== "host") return;
    const id = watcherId || from;
    if (id && sdp) await hostAcceptAnswer(id, sdp);
  });

  // ICE (both)
  socket.on(EVT.ice, async ({ from, watcherId, candidate } = {}) => {
    const id = watcherId || from;
    if (mode === "host") await hostAddIce(id, candidate);
    else await watchAddIce(candidate);
  });

  // Chat
  socket.on(EVT.chat, async (msg) => {
    if (!msg) return;
    messages.value.push(msg);
    await nextTick();
    scrollChat();
  });
}

function cleanup() {
  try { socket?.emit(EVT.leave, { liveId }); } catch {}

  // close all peers
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