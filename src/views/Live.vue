<template>
  <div class="live-page">
    <div class="topbar">
      <button class="back" @click="leaveLive">← Back</button>

      <div class="meta">
        <div class="title">Live</div>
        <div class="sub">{{ modeLabel }} • {{ liveId }}</div>
      </div>

      <div class="right">
        <span class="pill">{{ viewerCount }} viewers</span>
        <span v-if="connectionState !== 'connected'" class="pill warn">
          {{ connectionState }}
        </span>
      </div>
    </div>

    <div class="stage">
      <!-- Host sees their own camera -->
      <video
        v-if="isHost"
        ref="localVideo"
        autoplay
        playsinline
        muted
        class="main-video"
      ></video>

      <!-- Viewer sees host + their own audio when approved -->
      <template v-else>
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          webkit-playsinline
          class="main-video"
        />
        <!-- Local audio feedback for speaker -->
        <audio
          v-if="canSpeak && localStream"
          ref="localAudio"
          autoplay
          muted
          :srcObject="localStream"
        />
      </template>
    </div>

    <div class="controls">
      <button v-if="!isHost && !canSpeak" class="btn" @click="requestMic">
        Request Mic
      </button>
      
      <button v-if="!isHost && canSpeak" class="btn warn" @click="revokeMic">
        Mute Self
      </button>

      <button v-if="isHost" class="btn danger" @click="endLive">
        End Live
      </button>
    </div>

    <!-- Host mic request panel -->
    <div v-if="isHost && micRequests.length" class="host-panel">
      <div class="panel-title">Mic requests ({{ micRequests.length }})</div>

      <div
        v-for="req in micRequests"
        :key="req.fromUserId"
        class="req-row"
      >
        <span>{{ req.fromName || 'Anonymous' }}</span>
        <div class="row-actions">
          <button @click="approveMic(req)">Approve</button>
          <button class="danger" @click="denyMic(req)">Deny</button>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div class="chat">
      <div class="messages" ref="chatScroll">
        <div v-for="(msg, i) in chat" :key="msg.id || i" class="msg">
          <strong>{{ msg.from?.username || "Anon" }}:</strong> {{ msg.message }}
        </div>
        <div v-if="!chat.length" class="empty">No messages yet...</div>
      </div>

      <form class="composer" @submit.prevent="sendChat">
        <input 
          v-model="chatText" 
          placeholder="Say something..." 
          maxlength="200"
        />
        <button type="submit" :disabled="!chatText.trim()">Send</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import socket, { refreshSocketAuth } from "../socket";

const route = useRoute();
const router = useRouter();

const liveId = String(route.query.liveId || `live-${Date.now()}`);
const mode = String(route.query.mode || "viewer");

const isHost = mode === "host";
const modeLabel = isHost ? "Hosting" : "Watching";

// Refs
const localVideo = ref(null);
const remoteVideo = ref(null);
const localAudio = ref(null);
const chatScroll = ref(null);

// State
const viewerCount = ref(0);
const chat = ref([]);
const chatText = ref("");
const micRequests = ref([]);
const canSpeak = ref(false);
const connectionState = ref("new");
const isJoining = ref(false);

// WebRTC state
let pc = null;
let localStream = null;
let remoteStream = null;
let hostSocketId = null;
let makingOffer = false;
let ignoreOffer = false;
let polite = !isHost; // Host is impolite, viewer is polite

/* ================= ICE SERVERS ================= */
async function getIceServers() {
  try {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const res = await fetch(`${base}/api/turn`);
    const data = await res.json();
    return data?.iceServers?.length
      ? data.iceServers
      : [{ urls: "stun:stun.l.google.com:19302" }];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

/* ================= PEER CONNECTION ================= */
async function ensurePeer() {
  if (pc) return pc;

  pc = new RTCPeerConnection({
    iceServers: await getIceServers(),
  });

  // Connection state monitoring
  pc.onconnectionstatechange = () => {
    connectionState.value = pc.connectionState;
    console.log("Connection state:", pc.connectionState);
    
    if (pc.connectionState === "failed") {
      // Attempt recovery
      setTimeout(() => {
        if (pc?.connectionState === "failed") {
          reconnect();
        }
      }, 2000);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE state:", pc.iceConnectionState);
  };

  // Track handling with replace logic
  pc.ontrack = (event) => {
    console.log("📡 TRACK:", event.track.kind, "from", event.transceiver?.mid);
    
    if (!remoteStream) {
      remoteStream = new MediaStream();
    }

    // Replace existing track of same kind instead of accumulating
    const existing = remoteStream.getTracks().filter(t => t.kind === event.track.kind);
    existing.forEach(t => remoteStream.removeTrack(t));
    
    remoteStream.addTrack(event.track);

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = remoteStream;
    }
  };

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (!event.candidate || !hostSocketId) return;

    socket.emit("webrtc:ice", {
      liveId,
      to: hostSocketId,
      candidate: event.candidate,
    });
  };

  // Negotiation needed (critical for renegotiation when adding tracks)
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      
      socket.emit("webrtc:offer", {
        liveId,
        to: hostSocketId,
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error("Negotiation failed:", err);
    } finally {
      makingOffer = false;
    }
  };

  return pc;
}

/* ================= HOST STREAM ================= */
async function createHostStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    if (localVideo.value) {
      localVideo.value.srcObject = localStream;
    }
  } catch (err) {
    console.error("Failed to get host media:", err);
    alert("Camera access required to host");
  }
}

/* ================= VIEWER CONNECTION ================= */
async function connectViewerToHost() {
  if (!hostSocketId || isJoining.value) return;
  isJoining.value = true;

  try {
    const peer = await ensurePeer();

    // If we have speaking rights, add audio track
    if (canSpeak.value && !localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
    }

    // Create offer if we're the polite peer (viewer)
    if (polite) {
      const offer = await peer.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });

      await peer.setLocalDescription(offer);

      socket.emit("webrtc:offer", {
        liveId,
        to: hostSocketId,
        offer,
      });
    }
  } catch (err) {
    console.error("Connect viewer failed:", err);
  } finally {
    isJoining.value = false;
  }
}

/* ================= RENEGOTIATE (for mic approval) ================= */
async function renegotiate() {
  if (!pc || !hostSocketId) return;
  
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    
    socket.emit("webrtc:offer", {
      liveId,
      to: hostSocketId,
      offer: pc.localDescription,
    });
  } catch (err) {
    console.error("Renegotiation failed:", err);
  } finally {
    makingOffer = false;
  }
}

/* ================= CHAT ================= */
function sendChat() {
  const value = chatText.value.trim();
  if (!value) return;

  socket.emit("live:chat", {
    liveId,
    message: value,
  });

  chatText.value = "";
}

// Auto-scroll chat
watch(chat, () => {
  nextTick(() => {
    if (chatScroll.value) {
      chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }
  });
}, { deep: true });

/* ================= MIC MANAGEMENT ================= */
function requestMic() {
  socket.emit("live:mic:request", { liveId });
}

function revokeMic() {
  // Stop sending audio
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  
  // Remove sender from peer
  if (pc) {
    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === "audio") {
        pc.removeTrack(sender);
      }
    });
  }
  
  canSpeak.value = false;
  socket.emit("live:mic:revoke", { liveId });
}

function approveMic(req) {
  socket.emit("live:mic:approve", {
    liveId,
    userId: req.fromUserId,
  });

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  );
}

function denyMic(req) {
  socket.emit("live:mic:deny", {
    liveId,
    userId: req.fromUserId,
    reason: "Host denied request",
  });

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  );
}

/* ================= LIFECYCLE ================= */
function leaveLive() {
  socket.emit("live:leave", { liveId });
  cleanup();
  router.back();
}

function endLive() {
  socket.emit("live:end", { liveId });
  cleanup();
  router.back();
}

function cleanup() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((t) => t.stop());
    remoteStream = null;
  }
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onnegotiationneeded = null;
    pc.onconnectionstatechange = null;
    pc.close();
    pc = null;
  }
  hostSocketId = null;
  connectionState.value = "closed";
}

async function reconnect() {
  console.log("Attempting reconnect...");
  cleanup();
  if (!isHost && hostSocketId) {
    await connectViewerToHost();
  }
}

/* ================= SOCKET HANDLERS ================= */
async function onLiveHost(payload) {
  hostSocketId = payload?.hostSocketId || null;

  if (!isHost && hostSocketId) {
    await connectViewerToHost();
  }
}

function onLivePresence(payload) {
  viewerCount.value = Number(payload?.viewerCount || 0);
}

function onLiveChat(payload) {
  chat.value.push({ ...payload, id: Date.now() + Math.random() });
}

function onMicRequested(payload) {
  if (!isHost) return;
  // Prevent duplicates
  const exists = micRequests.value.some(
    r => String(r.fromUserId) === String(payload.fromUserId)
  );
  if (!exists) {
    micRequests.value.unshift(payload);
  }
}

async function onMicStatus(payload) {
  const newCanSpeak = !!payload?.canSpeak;
  
  if (newCanSpeak && !canSpeak.value) {
    // Just approved — get audio and renegotiate
    canSpeak.value = true;
    await connectViewerToHost();
  } else if (!newCanSpeak && canSpeak.value) {
    // Revoked
    revokeMic();
  }
}

// Perfect negotiation pattern
async function onOffer({ offer, from }) {
  if (isHost) {
    hostSocketId = from;
  }

  const peer = await ensurePeer();

  // Perfect negotiation: ignore offer if we're making one
  const readyForOffer = 
    !makingOffer &&
    (pc.signalingState === "stable" || isSettingRemoteAnswerPending);

  const offerCollision = offer.type === "offer" && !readyForOffer;
  ignoreOffer = !polite && offerCollision;

  if (ignoreOffer) {
    console.log("Ignoring colliding offer");
    return;
  }

  isSettingRemoteAnswerPending = offer.type === "answer";
  await peer.setRemoteDescription(offer);
  isSettingRemoteAnswerPending = false;

  if (offer.type === "offer") {
    // Host: ensure stream exists and add tracks
    if (isHost && !localStream) {
      await createHostStream();
    }

    // Only add tracks if not already added (prevent duplicates)
    if (isHost && localStream) {
      const existingKinds = new Set(peer.getSenders().map(s => s.track?.kind));
      localStream.getTracks().forEach((track) => {
        if (!existingKinds.has(track.kind)) {
          peer.addTrack(track, localStream);
        }
      });
    }

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      liveId,
      to: from,
      answer,
    });
  }
}

let isSettingRemoteAnswerPending = false;

async function onAnswer({ answer }) {
  if (!pc) return;
  isSettingRemoteAnswerPending = answer.type === "answer";
  await pc.setRemoteDescription(answer);
  isSettingRemoteAnswerPending = false;
}

async function onIce({ candidate }) {
  if (!pc || !candidate) return;
  try {
    await pc.addIceCandidate(candidate);
  } catch (err) {
    if (!ignoreOffer) {
      console.error("ICE error:", err);
    }
  }
}

function onLiveEnded() {
  cleanup();
  router.back();
}

/* ================= MOUNT / UNMOUNT ================= */
onMounted(async () => {
  refreshSocketAuth();

  // Register all handlers
  socket.on("live:host", onLiveHost);
  socket.on("live:presence", onLivePresence);
  socket.on("live:chat", onLiveChat);
  socket.on("live:mic:requested", onMicRequested);
  socket.on("live:mic:status", onMicStatus);
  socket.on("webrtc:offer", onOffer);
  socket.on("webrtc:answer", onAnswer);
  socket.on("webrtc:ice", onIce);
  socket.on("live:ended", onLiveEnded);

  if (isHost) {
    await createHostStream();
    socket.emit("live:create", { liveId });
  } else {
    // ✅ CRITICAL FIX: Viewer must join
    socket.emit("live:join", { liveId });
  }
});

onBeforeUnmount(() => {
  // Remove all handlers
  socket.off("live:host", onLiveHost);
  socket.off("live:presence", onLivePresence);
  socket.off("live:chat", onLiveChat);
  socket.off("live:mic:requested", onMicRequested);
  socket.off("live:mic:status", onMicStatus);
  socket.off("webrtc:offer", onOffer);
  socket.off("webrtc:answer", onAnswer);
  socket.off("webrtc:ice", onIce);
  socket.off("live:ended", onLiveEnded);

  cleanup();
});
</script>

<style scoped>
.live-page {
  min-height: 100vh;
  background: #08111d;
  color: white;
  padding: 14px;
  max-width: 800px;
  margin: 0 auto;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.back, .btn, .row-actions button {
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}
.title { font-weight: 900; font-size: 18px; }
.sub { opacity: 0.75; font-size: 13px; }
.pill {
  background: rgba(255,255,255,0.1);
  padding: 10px 12px;
  border-radius: 999px;
  font-size: 13px;
}
.pill.warn {
  background: #f59e0b;
  color: #000;
}
.stage {
  margin-top: 14px;
  border-radius: 24px;
  overflow: hidden;
  background: #000;
  position: relative;
}
.main-video {
  width: 100%;
  min-height: 52vh;
  object-fit: cover;
  display: block;
}
.controls {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}
.btn { 
  background: white; 
  color: #08111d;
}
.btn.danger, .danger { 
  background: #ef4444; 
  color: white; 
}
.btn.warn {
  background: #f59e0b;
  color: #000;
}
.host-panel, .chat {
  margin-top: 14px;
  border-radius: 22px;
  padding: 14px;
  background: rgba(255,255,255,0.06);
}
.panel-title { 
  font-weight: 800; 
  margin-bottom: 10px; 
}
.req-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.row-actions {
  display: flex;
  gap: 8px;
}
.messages {
  max-height: 220px;
  overflow-y: auto;
}
.empty {
  opacity: 0.5;
  text-align: center;
  padding: 20px;
}
.msg {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  word-break: break-word;
}
.composer {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.composer input {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 12px;
  background: rgba(255,255,255,0.1);
  color: white;
}
.composer input::placeholder {
  color: rgba(255,255,255,0.4);
}
.composer button {
  border: none;
  border-radius: 14px;
  padding: 0 20px;
  background: #22c55e;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.composer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>