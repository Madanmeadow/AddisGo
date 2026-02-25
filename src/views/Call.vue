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

// ✅ room-based id from dashboard/incoming popup
const roomId = String(route.query.roomId || route.query.callId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "audio");  // audio | video

const localVideo = ref(null);
const remoteVideo = ref(null);

const status = ref("Initializing…");
const muted = ref(false);
const camOff = ref(false);

let socket = null;
let pc = null;
let localStream = null;

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

const me = safeJsonParse(localStorage.getItem("user") || "null");

async function getIceServers() {
  try {
    const r = await fetch(`${apiUrl}/turn`);
    const j = await r.json();
    if (j?.iceServers) return j.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

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

async function initPeer() {
  const iceServers = await getIceServers();
  pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;

    // ✅ ROOM relay (no "to")
    socket?.emit("call:webrtc:ice", {
      roomId,
      candidate: event.candidate,
    });
  };

  pc.ontrack = async (event) => {
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = event.streams[0];
      try { await remoteVideo.value.play?.(); } catch {}
    }
  };

  // add local tracks
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
}

async function makeOffer() {
  status.value = "Creating offer…";
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // ✅ ROOM relay
  socket?.emit("call:webrtc:offer", { roomId, offer });

  status.value = "Offer sent. Waiting for answer…";
}

async function handleOffer(offer) {
  status.value = "Received offer…";
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // ✅ ROOM relay
  socket?.emit("call:webrtc:answer", { roomId, answer });

  status.value = "Answered. Connecting…";
}

async function handleAnswer(answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  status.value = "Connected ✅";
}

async function handleIce(candidate) {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

function toggleMute() {
  muted.value = !muted.value;
  localStream?.getAudioTracks()?.forEach((t) => (t.enabled = !muted.value));
}

function toggleCamera() {
  camOff.value = !camOff.value;
  localStream?.getVideoTracks()?.forEach((t) => (t.enabled = !camOff.value));
}

function cleanup() {
  try { pc?.close(); } catch {}
  pc = null;

  try { localStream?.getTracks()?.forEach((t) => t.stop()); } catch {}
  localStream = null;

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

onMounted(async () => {
  if (!roomId) return router.push("/dashboard");

  // ✅ Important: iOS needs media started ASAP (and accept click helps)
  await initMedia();

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", async () => {
    // ✅ register user so server can map userId->socket
    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    await initPeer();

    // ✅ join call room
    socket.emit("call:join", { roomId });

    status.value = role === "caller" ? "Joining call…" : "Waiting…";
  });

  // ✅ When both sides are in the room, server emits call:ready
  socket.on("call:ready", async ({ kind: k }) => {
    // (optional) trust server kind if you want
    // kind = k

    if (role === "caller") {
      // caller starts negotiation after both joined
      try {
        await makeOffer();
      } catch (e) {
        status.value = "Failed to create offer";
      }
    } else {
      status.value = "Waiting for offer…";
    }
  });

  // ✅ ROOM signaling events
  socket.on("call:webrtc:offer", async ({ offer }) => {
    try { await handleOffer(offer); } catch { status.value = "Offer error"; }
  });

  socket.on("call:webrtc:answer", async ({ answer }) => {
    try { await handleAnswer(answer); } catch { status.value = "Answer error"; }
  });

  socket.on("call:webrtc:ice", async ({ candidate }) => {
    await handleIce(candidate);
  });

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
.controls { display: flex; gap: 10px; margin-top: 12px; }
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