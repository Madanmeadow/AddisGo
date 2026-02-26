<template>
  <div class="call-page">
    <header class="top">
      <div class="left">
        <div class="pill">{{ kind.toUpperCase() }}</div>
        <div class="meta">
          <div class="h1">
            {{ role === "caller" ? "Calling…" : "In Call" }}
          </div>
          <div class="sub">Call: {{ roomId }}</div>
        </div>
      </div>

      <button class="btn danger" @click="endCall">End</button>
    </header>

    <div class="videos">
      <video ref="remoteVideo" class="remote" autoplay playsinline></video>
      <video ref="localVideo" class="local" autoplay playsinline muted></video>
    </div>

    <div class="controls">
      <button class="btn" @click="toggleMute">
        {{ muted ? "Unmute" : "Mute" }}
      </button>

      <button class="btn" v-if="kind === 'video'" @click="toggleCamera">
        {{ camOff ? "Camera On" : "Camera Off" }}
      </button>

      <!-- ✅ Screen Share (NEW) -->
      <button class="btn" v-if="kind === 'video'" @click="toggleShare">
        {{ sharing ? "Stop Share" : "Share Screen" }}
      </button>
    </div>

    <div class="status">{{ status }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { io } from "socket.io-client";

const route = useRoute();
const router = useRouter();

const apiUrl = import.meta.env.VITE_API_URL;

const roomId = String(route.query.roomId || route.query.callId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "audio");  // audio | video

const localVideo = ref(null);
const remoteVideo = ref(null);

const status = ref("Initializing…");
const muted = ref(false);
const camOff = ref(false);
const sharing = ref(false);

let socket = null;

// ✅ MULTI PEER: socketId -> RTCPeerConnection
const pcs = new Map(); // peerSocketId -> RTCPeerConnection

// streams
let localStream = null;     // camera/mic
let screenStream = null;    // display media (when sharing)

// cache latest peer shown in remoteVideo (since UI has 1 remote)
let lastRemotePeer = null;

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}
const me = safeJsonParse(localStorage.getItem("user") || "null");

/* =========================
   ICE SERVERS
========================= */
async function getIceServers() {
  try {
    const r = await fetch(`${apiUrl}/turn`);
    const j = await r.json();
    if (j?.iceServers) return j.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

/* =========================
   MEDIA
========================= */
async function initMedia() {
  const constraints =
    kind === "video"
      ? { audio: true, video: { facingMode: "user" } }
      : { audio: true, video: false };

  localStream = await navigator.mediaDevices.getUserMedia(constraints);

  if (localVideo.value) {
    localVideo.value.srcObject = localStream;
    try { await localVideo.value.play?.(); } catch {}
  }
}

/* =========================
   PEER CONNECTION (per peer)
========================= */
async function ensurePC(peerSocketId) {
  if (!peerSocketId) return null;
  if (pcs.has(peerSocketId)) return pcs.get(peerSocketId);

  const iceServers = await getIceServers();
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    socket?.emit("call:webrtc:ice", {
      roomId,
      to: peerSocketId,
      candidate: event.candidate,
    });
  };

  pc.ontrack = async (event) => {
    // Since UI has 1 remote video, we show the most recent peer stream
    lastRemotePeer = peerSocketId;

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = event.streams[0];
      try { await remoteVideo.value.play?.(); } catch {}
    }
  };

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "connected") status.value = "Connected ✅";
    if (st === "failed") status.value = "Connection failed (try again)";
  };

  // Add local tracks
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pcs.set(peerSocketId, pc);
  return pc;
}

async function createOfferTo(peerSocketId) {
  const pc = await ensurePC(peerSocketId);
  if (!pc) return;

  status.value = "Creating offer…";
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket?.emit("call:webrtc:offer", { roomId, to: peerSocketId, offer });
  status.value = "Offer sent. Waiting for answer…";
}

async function handleOffer(fromPeerSocketId, offer) {
  const pc = await ensurePC(fromPeerSocketId);
  if (!pc) return;

  status.value = "Received offer…";
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket?.emit("call:webrtc:answer", { roomId, to: fromPeerSocketId, answer });
  status.value = "Answered. Connecting…";
}

async function handleAnswer(fromPeerSocketId, answer) {
  const pc = await ensurePC(fromPeerSocketId);
  if (!pc) return;

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  status.value = "Connected ✅";
}

async function handleIce(fromPeerSocketId, candidate) {
  const pc = await ensurePC(fromPeerSocketId);
  if (!pc) return;

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

/* =========================
   CONTROLS
========================= */
function toggleMute() {
  muted.value = !muted.value;
  localStream?.getAudioTracks()?.forEach((t) => (t.enabled = !muted.value));
}

function toggleCamera() {
  camOff.value = !camOff.value;
  localStream?.getVideoTracks()?.forEach((t) => (t.enabled = !camOff.value));
}

/* =========================
   SCREEN SHARE (NEW)
   - replace outgoing video track for ALL PCs
========================= */
async function toggleShare() {
  if (kind !== "video") return;

  if (!sharing.value) {
    try {
      // start screen share
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      // replace sender track on all peer connections
      for (const pc of pcs.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
      }

      // show your own screen locally
      if (localVideo.value) {
        localVideo.value.srcObject = screenStream;
        try { await localVideo.value.play?.(); } catch {}
      }

      sharing.value = true;

      // if user stops via browser UI
      screenTrack.onended = () => {
        if (sharing.value) toggleShare();
      };
    } catch (e) {
      status.value = "Screen share blocked/canceled";
    }
  } else {
    // stop share, return to camera
    try {
      const camTrack = localStream?.getVideoTracks()?.[0] || null;

      for (const pc of pcs.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && camTrack) await sender.replaceTrack(camTrack);
      }

      // restore local preview to camera
      if (localVideo.value) {
        localVideo.value.srcObject = localStream;
        try { await localVideo.value.play?.(); } catch {}
      }

      try { screenStream?.getTracks()?.forEach((t) => t.stop()); } catch {}
      screenStream = null;
      sharing.value = false;
    } catch {
      sharing.value = false;
    }
  }
}

/* =========================
   CLEANUP
========================= */
function cleanup() {
  try {
    for (const pc of pcs.values()) {
      try { pc.close(); } catch {}
    }
  } catch {}
  pcs.clear();

  try { localStream?.getTracks()?.forEach((t) => t.stop()); } catch {}
  localStream = null;

  try { screenStream?.getTracks()?.forEach((t) => t.stop()); } catch {}
  screenStream = null;

  try { socket?.disconnect(); } catch {}
  socket = null;
}

function endCall() {
  try {
    socket?.emit("call:end", { roomId });
  } catch {}
  cleanup();
  router.push("/dashboard");
}

/* =========================
   INIT
========================= */
onMounted(async () => {
  if (!roomId) return router.push("/dashboard");

  // ✅ iOS: start media ASAP
  await initMedia();

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    // ✅ register presence
    if (me?.id) socket.emit("user:online", { userId: me.id });
    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    // ✅ join call room
    socket.emit("call:join", { roomId });

    status.value = role === "caller" ? "Joining call…" : "Waiting…";
  });

  // server says call is ready when >=2 in room
  socket.on("call:ready", async () => {
    // In group mesh, we DO NOT auto-offer to everyone here.
    // Offers are created when we hear "call:peer-joined"
    if (role === "caller") status.value = "Ready. Waiting for peers…";
    else status.value = "Ready. Waiting for peers…";
  });

  // ✅ NEW: mesh handshake trigger
  // When someone joins, existing users should create an offer to that peer socketId
  socket.on("call:peer-joined", async ({ peerSocketId }) => {
    // Ignore invalid or myself
    if (!peerSocketId || peerSocketId === socket.id) return;

    // Make offer to the new peer
    try {
      await createOfferTo(peerSocketId);
    } catch (e) {
      // ignore
    }
  });

  // ✅ targeted signaling for mesh
  socket.on("call:webrtc:offer", async ({ from, offer }) => {
    try {
      // Some servers might not send "from" (older). fallback: ignore.
      if (!from) return;
      await handleOffer(from, offer);
    } catch {
      status.value = "Offer error";
    }
  });

  socket.on("call:webrtc:answer", async ({ from, answer }) => {
    try {
      if (!from) return;
      await handleAnswer(from, answer);
    } catch {
      status.value = "Answer error";
    }
  });

  socket.on("call:webrtc:ice", async ({ from, candidate }) => {
    if (!from) return;
    await handleIce(from, candidate);
  });

  // if someone ends call
  socket.on("call:ended", () => {
    status.value = "Call ended";
    setTimeout(() => {
      cleanup();
      router.push("/dashboard");
    }, 400);
  });

  socket.on("call:error", ({ message }) => {
    status.value = message || "Call error";
  });
});

onBeforeUnmount(() => cleanup());
</script>

<style scoped>
.call-page {
  min-height: 100vh;
  padding: 16px;
  background: radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.20), transparent),
              radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.18), transparent),
              #0b1220;
  color: white;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.left { display:flex; gap:12px; align-items:center; }
.meta .h1 { font-weight: 900; font-size: 18px; }
.meta .sub { opacity: .75; font-size: 12px; }
.pill {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 900;
  font-size: 12px;
}
.videos {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12);
  min-height: 62vh;
}
.remote { width: 100%; height: 62vh; object-fit: cover; background: #000; }
.local {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 34%;
  max-width: 180px;
  aspect-ratio: 9/16;
  border-radius: 14px;
  object-fit: cover;
  background: #000;
  border: 1px solid rgba(255,255,255,0.18);
}
.controls { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
}
.btn.danger {
  background: rgba(255,80,80,0.22);
  border: 1px solid rgba(255,80,80,0.35);
}
.status { margin-top: 12px; opacity: .85; font-size: 13px; }
</style>