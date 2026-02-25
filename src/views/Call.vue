<template>
  <div class="call-page">
    <header class="top">
      <div class="left">
        <div class="pill">{{ kind.toUpperCase() }}</div>
        <div class="meta">
          <div class="h1">
            <span v-if="role === 'caller' && status.includes('Ringing')">Calling…</span>
            <span v-else-if="role === 'caller'">Calling…</span>
            <span v-else>In Call</span>
          </div>
          <div class="sub">Call: {{ callId }}</div>
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

const callId = String(route.query.callId || route.query.roomId || ""); // support old param
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "audio");  // audio | video

// otherSocketId should be passed:
// - caller: from call:accepted event OR from dashboard after you start the call
// - callee: from incoming popup param
const otherSocketId = ref(String(route.query.otherSocketId || ""));

const localVideo = ref(null);
const remoteVideo = ref(null);

const status = ref("Initializing…");
const muted = ref(false);
const camOff = ref(false);

let socket = null;
let pc = null;
let localStream = null;

async function getIceServers() {
  // ✅ NO /api
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
  if (localVideo.value) localVideo.value.srcObject = localStream;
}

async function initPeer() {
  const iceServers = await getIceServers();
  pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate && otherSocketId.value) {
      socket.emit("webrtc:ice", {
        callId,
        to: otherSocketId.value,
        candidate: event.candidate,
      });
    }
  };

  pc.ontrack = (event) => {
    if (remoteVideo.value) remoteVideo.value.srcObject = event.streams[0];
  };

  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
}

async function makeOffer() {
  status.value = "Creating offer…";
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", {
    callId,
    to: otherSocketId.value,
    offer,
  });

  status.value = "Offer sent. Waiting for answer…";
}

async function handleOffer(offer, from) {
  status.value = "Received offer…";
  otherSocketId.value = otherSocketId.value || from;

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("webrtc:answer", {
    callId,
    to: from,
    answer,
  });

  status.value = "Answered. Connecting…";
}

async function handleAnswer(answer, from) {
  otherSocketId.value = otherSocketId.value || from;
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
    socket?.emit("call:end", { callId, otherSocketId: otherSocketId.value });
  } catch {}

  cleanup();
  router.push("/dashboard");
}

onMounted(async () => {
  if (!callId) return router.push("/dashboard");

  await initMedia();

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", async () => {
    await initPeer();

    if (role === "caller") {
      // caller MUST know otherSocketId (after accept) OR passed via query
      if (!otherSocketId.value) {
        status.value = "Ringing… waiting for callee to accept";
      } else {
        await makeOffer();
      }
    } else {
      status.value = "Waiting for offer…";
    }
  });

  // ✅ If caller didn’t know socketId yet, backend will send call:accepted
  socket.on("call:accepted", async ({ callId: cId, calleeSocketId }) => {
    if (String(cId) !== callId) return;
    otherSocketId.value = calleeSocketId;
    status.value = "Accepted ✅ connecting…";
    if (role === "caller") await makeOffer();
  });

  socket.on("call:rejected", ({ callId: cId }) => {
    if (String(cId) !== callId) return;
    status.value = "Rejected ❌";
    setTimeout(() => {
      cleanup();
      router.push("/dashboard");
    }, 600);
  });

  // ✅ WebRTC relay: now uses callId (not liveId)
  socket.on("webrtc:offer", async ({ callId: cId, offer, from }) => {
    if (String(cId) !== callId) return;
    await handleOffer(offer, from);
  });

  socket.on("webrtc:answer", async ({ callId: cId, answer, from }) => {
    if (String(cId) !== callId) return;
    await handleAnswer(answer, from);
  });

  socket.on("webrtc:ice", async ({ callId: cId, candidate }) => {
    if (String(cId) !== callId) return;
    await handleIce(candidate);
  });

  socket.on("call:ended", ({ callId: cId }) => {
    if (String(cId) !== callId) return;
    status.value = "Call ended";
    setTimeout(() => {
      cleanup();
      router.push("/dashboard");
    }, 500);
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