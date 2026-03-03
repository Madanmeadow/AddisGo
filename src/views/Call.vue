<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="wrap">
      <header class="topbar">
        <div class="left">
          <div class="pill">
            <span class="t">{{ kindLabel }}</span>
            <span class="s">{{ statusLabel }}</span>
          </div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMic">{{ micMuted ? "🔇 Mic" : "🎙️ Mic" }}</button>
          <button v-if="kind === 'video'" class="chip ghost" @click="toggleCam">{{ camOff ? "📷 Off" : "📹 Cam" }}</button>

          <button class="chip ghost ok" v-if="status === 'failed' || status === 'connecting'" @click="reconnectNow">
            ♻️ Reconnect
          </button>

          <button class="chip danger" @click="endCall">End</button>
        </div>
      </header>

      <main class="grid">
        <section class="card">
          <div class="cardTop">
            <div class="label">REMOTE</div>
            <div class="hint" v-if="status !== 'live'">Waiting…</div>
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
          </div>

          <video v-if="kind === 'video'" ref="localVideo" class="video" autoplay playsinline muted></video>

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
import { io } from "socket.io-client";

const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

const route = useRoute();
const router = useRouter();

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "video"); // video | audio

const token = localStorage.getItem("token") || "";
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
const kindLabel = computed(() => (kind === "video" ? "VIDEO CALL" : "AUDIO CALL"));

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

// who to send SDP/ICE to (best reliability)
let remoteSocketId = null;

// prevent double-offer storms
let offeredOnce = false;

/* =========================
   TURN/ICE
========================= */
async function getIceServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`);
    const data = await res.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) return data.iceServers;
  } catch {}
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
}

let cachedIce = null;
async function makePC() {
  if (!cachedIce) cachedIce = await getIceServers();
  return new RTCPeerConnection({ iceServers: cachedIce });
}

function safeStopTracks(stream) {
  try { stream?.getTracks?.().forEach(t => t.stop()); } catch {}
}

function applyMediaToggles() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(t => (t.enabled = !micMuted.value));
  localStream.getVideoTracks().forEach(t => (t.enabled = !camOff.value));
}

async function getMedia() {
  try {
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
    overlayTip.value = "Camera/Mic blocked. Allow permissions and reconnect.";
    status.value = "failed";
  }
}

async function buildPeer() {
  pc = await makePC();

  // ICE -> relay through server
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket?.emit("call:webrtc:ice", {
        roomId,
        candidate: e.candidate,
        to: remoteSocketId || undefined,
      });
    }
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
    toast.value = "Connected ✅";
  };

  pc.onconnectionstatechange = () => {
    const st = pc?.connectionState;
    if (st === "failed") {
      status.value = "failed";
      overlayTip.value = "Connection failed. Tap Reconnect.";
    }
    if (st === "disconnected") {
      if (status.value !== "ended") {
        status.value = "connecting";
        overlayTip.value = "Peer disconnected. Waiting/reconnecting…";
      }
    }
  };

  // attach local tracks
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
}

async function callerStartOffer() {
  if (!pc || offeredOnce) return;
  offeredOnce = true;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket?.emit("call:webrtc:offer", {
    roomId,
    offer,
    to: remoteSocketId || undefined,
  });
}

/* =========================
   Handle incoming SDP/ICE (server events)
========================= */
async function handleOffer(payload) {
  const offer = payload?.offer;
  if (!offer) return;

  // capture who sent it (so we can send answer/ice back)
  if (payload?.from) remoteSocketId = String(payload.from);

  if (!pc) await buildPeer();

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket?.emit("call:webrtc:answer", {
    roomId,
    answer,
    to: remoteSocketId || undefined,
  });
}

async function handleAnswer(payload) {
  const answer = payload?.answer;
  if (!answer || !pc) return;

  if (payload?.from) remoteSocketId = String(payload.from);
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIce(payload) {
  const candidate = payload?.candidate;
  if (!candidate || !pc) return;

  if (payload?.from) remoteSocketId = String(payload.from);
  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
}

/* =========================
   Socket init
========================= */
async function initSocket() {
  socket = io(apiUrl, {
    transports: ["websocket", "polling"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
  });

  socket.on("connect", async () => {
    status.value = "connecting";
    toast.value = "Connected to server…";

    // join call room (server only needs {roomId})
    socket.emit("call:join", { roomId, role, kind });

    // make sure media + pc exist
    if (!localStream) await getMedia();
    if (!pc) await buildPeer();
  });

  socket.on("disconnect", () => {
    if (status.value !== "ended") {
      status.value = "connecting";
      overlayTip.value = "Disconnected. Reconnecting…";
    }
  });

  // server tells us who joined (gives socket id to target)
  socket.on("call:peer-joined", ({ peerSocketId } = {}) => {
    if (peerSocketId) remoteSocketId = String(peerSocketId);

    // if caller and peer appears, start offer
    if (role === "caller") {
      callerStartOffer().catch(() => {});
    }
  });

  // server says call room ready (>=2)
  socket.on("call:ready", () => {
    if (role === "caller") {
      callerStartOffer().catch(() => {});
    }
  });

  // if peer leaves
  socket.on("call:peer-left", () => {
    if (status.value !== "ended") {
      status.value = "connecting";
      overlayTip.value = "Peer left. Waiting for reconnect…";
    }
  });

  socket.on("call:webrtc:offer", async (p) => {
    await handleOffer(p);
  });

  socket.on("call:webrtc:answer", async (p) => {
    await handleAnswer(p);
  });

  socket.on("call:webrtc:ice", async (p) => {
    await handleIce(p);
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
   UI actions
========================= */
function toggleMic() {
  micMuted.value = !micMuted.value;
  applyMediaToggles();
}

function toggleCam() {
  camOff.value = !camOff.value;
  applyMediaToggles();
}

async function reconnectNow() {
  overlayTip.value = "Reconnecting…";
  status.value = "connecting";

  offeredOnce = false;
  remoteSocketId = null;

  try { pc?.close(); } catch {}
  pc = null;

  try { socket?.disconnect(); } catch {}
  socket = null;

  if (!localStream) await getMedia();
  await initSocket();
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

/* =========================
   Mount
========================= */
onMounted(async () => {
  if (!roomId) {
    status.value = "failed";
    overlayTip.value = "Missing roomId.";
    return;
  }
  await initSocket();
});

onBeforeUnmount(() => endCall(true));
</script>

<style scoped>
/* (UNCHANGED: your exact CSS) */
.wrap{
  min-height: 100vh;
  padding-bottom: 24px;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.18), transparent),
    radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.16), transparent),
    #0b1220;
  color: #fff;
}

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
.left, .right{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; }

.pill{
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}
.t{ font-weight: 950; }
.s{ opacity: .75; font-size: 12px; }

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
}
.label{ font-weight: 950; opacity:.9; }
.hint{ opacity:.75; font-size: 12px; }

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