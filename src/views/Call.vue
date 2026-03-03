<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="callWrap">
      <div class="bg-animated" aria-hidden="true"></div>

      <header class="topbar">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="pill">
          <span class="dot" :class="{ on: connected }"></span>
          <span class="t">CALL</span>
          <span class="s">{{ kind.toUpperCase() }} • {{ role.toUpperCase() }} • {{ roomId }}</span>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMic">{{ micMuted ? "🔇 Mic" : "🎙️ Mic" }}</button>
          <button v-if="kind === 'video'" class="chip ghost" @click="toggleCam">
            {{ camOff ? "📷 Off" : "📹 Cam" }}
          </button>
          <button class="chip ghost ok" @click="restartIce" :disabled="!pc">♻️ Restart ICE</button>
          <button class="chip danger" @click="endCall">End</button>
        </div>
      </header>

      <main class="grid">
        <section class="card">
          <div class="cardTop">
            <div class="label">REMOTE</div>
            <div class="hint" v-if="status !== 'live'">{{ statusLabel }}</div>
          </div>

          <video v-if="kind === 'video'" ref="remoteVideo" class="video" autoplay playsinline></video>
          <audio v-else ref="remoteAudio" autoplay></audio>

          <div v-if="overlayTip" class="overlayTip">
            <div class="overlayText">{{ overlayTip }}</div>
            <button class="chip mini ghost" @click="overlayTip=''">OK</button>
          </div>
        </section>

        <section class="card">
          <div class="cardTop">
            <div class="label">YOU</div>
            <div class="hint small">{{ debugLine }}</div>
          </div>

          <video
            v-if="kind === 'video'"
            ref="localVideo"
            class="video"
            autoplay
            playsinline
            muted
          ></video>

          <div v-else class="audioBox">
            <div class="meIcon">🎙️</div>
            <div class="meText">{{ me?.username || "You" }}</div>
          </div>
        </section>
      </main>

      <div v-if="toast" class="toast">
        <span class="dot"></span>
        {{ toast }}
        <button class="miniX" @click="toast=''">✕</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { createSocket } from "../api/socket";

const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
const token = localStorage.getItem("token");

const route = useRoute();
const router = useRouter();

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "video");  // video | audio

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const status = ref("connecting"); // connecting | live | ended | failed
const statusLabel = computed(() => {
  if (status.value === "live") return "Connected";
  if (status.value === "ended") return "Ended";
  if (status.value === "failed") return "Failed";
  return "Connecting…";
});

const connected = ref(false);
const overlayTip = ref("");
const toast = ref("");

const localVideo = ref(null);
const remoteVideo = ref(null);
const remoteAudio = ref(null);

let socket = null;
let pc = null;
let localStream = null;

const micMuted = ref(false);
const camOff = ref(false);

const iceState = ref("new");
const connState = ref("new");
const sigState = ref("stable");

const debugLine = computed(() => `ICE:${iceState.value} • Conn:${connState.value} • Sig:${sigState.value}`);

function safeStopTracks(stream) {
  try { stream?.getTracks?.().forEach(t => t.stop()); } catch {}
}

/* =========================
   TURN / ICE SERVERS (uses your /api/turn)
========================= */
async function getIceServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`);
    const data = await res.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) return data.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

function applyMediaToggles() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(t => (t.enabled = !micMuted.value));
  localStream.getVideoTracks().forEach(t => (t.enabled = !camOff.value));
}

async function getMedia() {
  try {
    overlayTip.value = "";
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video" ? { facingMode: "user" } : false,
    });

    applyMediaToggles();

    if (kind === "video" && localVideo.value) {
      localVideo.value.srcObject = localStream;
      await localVideo.value.play().catch(() => {});
    }
  } catch {
    overlayTip.value = "Camera/Mic blocked. Allow permissions and retry.";
    status.value = "failed";
  }
}

async function buildPeer() {
  const iceServers = await getIceServers();

  pc = new RTCPeerConnection({
    iceServers,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) emitIce(e.candidate);
  };

  pc.ontrack = async (e) => {
    const [stream] = e.streams || [];
    if (!stream) return;

    if (kind === "video" && remoteVideo.value) {
      remoteVideo.value.srcObject = stream;
      await remoteVideo.value.play().catch(() => {});
    } else if (remoteAudio.value) {
      remoteAudio.value.srcObject = stream;
      await remoteAudio.value.play().catch(() => {});
    }

    status.value = "live";
    overlayTip.value = "";
  };

  pc.oniceconnectionstatechange = () => {
    iceState.value = pc?.iceConnectionState || "new";
    if (iceState.value === "failed") {
      status.value = "failed";
      overlayTip.value = "ICE failed. Try Restart ICE.";
    }
  };

  pc.onconnectionstatechange = () => {
    connState.value = pc?.connectionState || "new";
    if (connState.value === "failed") {
      status.value = "failed";
      overlayTip.value = "Connection failed. Try Restart ICE.";
    }
  };

  pc.onsignalingstatechange = () => {
    sigState.value = pc?.signalingState || "stable";
  };

  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
}

/* =========================
   ✅ SIGNALING (matches YOUR server screenshot)
   Server uses: { offer } / { answer } / { candidate }
   We also support { sdp } just in case.
========================= */
function emitOffer(desc) {
  if (!socket || !desc) return;
  socket.emit("call:webrtc:offer", { roomId, offer: desc });
  socket.emit("call:webrtc:offer", { roomId, sdp: desc }); // fallback
}

function emitAnswer(desc) {
  if (!socket || !desc) return;
  socket.emit("call:webrtc:answer", { roomId, answer: desc });
  socket.emit("call:webrtc:answer", { roomId, sdp: desc }); // fallback
}

function emitIce(candidate) {
  if (!socket || !candidate) return;
  socket.emit("call:webrtc:ice", { roomId, candidate });
}

async function makeOfferIfCaller() {
  if (!pc || role !== "caller") return;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  emitOffer(pc.localDescription);
}

async function onOffer(sdpLike) {
  if (!pc) return;
  const sdp = sdpLike;
  if (!sdp || !sdp.type) return console.warn("Bad OFFER:", sdpLike);

  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  emitAnswer(pc.localDescription);
}

async function onAnswer(sdpLike) {
  if (!pc) return;
  const sdp = sdpLike;
  if (!sdp || !sdp.type) return console.warn("Bad ANSWER:", sdpLike);

  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

async function onRemoteIce(candidate) {
  try {
    if (!pc || !candidate) return;
    // if remoteDescription not set yet, addIceCandidate may warn; ignore safely
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

async function initSocket() {
  socket = createSocket();

  socket.on("connect", async () => {
    connected.value = true;
    status.value = "connecting";
    toast.value = "Connected to server…";

    // presence helps your server map user -> socket
    if (me?.id) {
      const username = me?.username || me?.display_name || me?.email || `User${me.id}`;
      socket.emit("user:online", { userId: String(me.id), username });
      socket.emit("register-user", { id: String(me.id), username });
    }

    socket.emit("call:join", { roomId, role, kind });

    // ensure peer + media ready
    if (!localStream) await getMedia();
    if (!pc) await buildPeer();

    // caller starts negotiation
    if (role === "caller") {
      await new Promise(r => setTimeout(r, 150));
      await makeOfferIfCaller();
    }
  });

  socket.on("disconnect", () => {
    connected.value = false;
    if (status.value !== "ended") {
      status.value = "connecting";
      overlayTip.value = "Disconnected. Reconnecting…";
    }
  });

  // ✅ your server emits these EXACT names with offer/answer
  socket.on("call:webrtc:offer", async (payload = {}) => {
    const sdp = payload.sdp || payload.offer;
    await onOffer(sdp);
  });

  socket.on("call:webrtc:answer", async (payload = {}) => {
    const sdp = payload.sdp || payload.answer;
    await onAnswer(sdp);
  });

  socket.on("call:webrtc:ice", async (payload = {}) => {
    await onRemoteIce(payload.candidate);
  });

  socket.on("call:ended", () => {
    endCall(true);
  });

  socket.on("call:error", ({ message } = {}) => {
    status.value = "failed";
    overlayTip.value = message || "Call error.";
  });
}

/* =========================
   Controls
========================= */
function toggleMic() {
  micMuted.value = !micMuted.value;
  applyMediaToggles();
}

function toggleCam() {
  camOff.value = !camOff.value;
  applyMediaToggles();
}

async function restartIce() {
  try {
    if (!pc) return;
    overlayTip.value = "Restarting ICE…";
    status.value = "connecting";

    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    emitOffer(pc.localDescription);

    overlayTip.value = "";
  } catch {
    overlayTip.value = "ICE restart failed.";
    status.value = "failed";
  }
}

function goBack() {
  endCall(true);
  router.push("/dashboard");
}

function endCall(fromRemote = false) {
  if (status.value === "ended") return;
  status.value = "ended";

  if (!fromRemote) {
    try { socket?.emit("call:end", { roomId }); } catch {}
  }

  try { pc?.close(); } catch {}
  pc = null;

  safeStopTracks(localStream);
  localStream = null;

  try { socket?.disconnect(); } catch {}
  socket = null;

  setTimeout(() => router.push("/dashboard"), 250);
}

onMounted(async () => {
  if (!roomId) {
    status.value = "failed";
    overlayTip.value = "Missing roomId.";
    return;
  }
  if (!token) {
    status.value = "failed";
    overlayTip.value = "Login again to call.";
    return;
  }

  await initSocket();
});

onBeforeUnmount(() => endCall(true));
</script>

<style scoped>
.callWrap{
  min-height: 100vh;
  padding-bottom: 24px;
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

.topbar{
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 14px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.10);
}
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
.dot{ width:10px; height:10px; border-radius:50%; background: rgba(255,255,255,.35); }
.dot.on{ background:#00e676; box-shadow: 0 0 16px rgba(0,230,118,.35); }
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
.chip.ok{ background: rgba(34,197,94,.18); border:1px solid rgba(34,197,94,.28); }
.chip.mini{ padding: 8px 10px; font-size: 12px; }

.grid{
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.card{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  min-height: 520px;
}

.cardTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom: 10px;
  gap: 10px;
}
.label{ font-weight: 950; opacity:.9; }
.hint{ opacity:.75; font-size: 12px; }
.hint.small{ opacity:.65; font-size: 11px; }

.video{
  width: 100%;
  height: auto;
  max-height: 76vh;
  border-radius: 16px;
  background: #000;
  object-fit: cover;
}

.audioBox{
  display:grid;
  place-items:center;
  height: 100%;
  min-height: 420px;
  border-radius: 16px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}
.meIcon{ font-size: 44px; margin-bottom: 8px; }
.meText{ font-weight: 950; opacity:.9; }

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
.overlayText{ flex: 1; }

.toast{
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 80;
  background: rgba(12,18,32,.95);
  border: 1px solid rgba(255,255,255,.14);
  padding: 10px 12px;
  border-radius: 999px;
  display:flex;
  align-items:center;
  gap: 10px;
}
.dot{ width: 10px; height:10px; border-radius:50%; background:#00e676; }
.miniX{ border:none; cursor:pointer; background: rgba(255,255,255,.10); color:#fff; border-radius: 10px; padding: 4px 8px; }

@media (max-width: 980px){
  .grid{ grid-template-columns: 1fr; }
  .card{ min-height: 420px; }
}
</style>