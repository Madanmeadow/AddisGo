<template>
  <div class="live-page">
    <!-- Topbar -->
    <div class="topbar">
      <button class="back" @click="leaveLive">← Back</button>

      <div class="meta">
        <div class="title">
          <span class="live-dot"></span> Live
        </div>
        <div class="sub">
          <span v-if="isHost" class="live-timer">{{ streamDuration }}</span>
          <span v-else>Watching</span>
        </div>
      </div>

      <div class="right">
        <button class="pill viewer-pill" @click="showViewerList = !showViewerList">
          {{ viewerCount }} viewers
        </button>
        <span v-if="connectionState !== 'connected'" class="pill warn">
          {{ connectionState }}
        </span>
      </div>
    </div>

    <!-- Stage -->
    <div class="stage">
      <video
        v-if="isHost"
        ref="localVideo"
        autoplay
        playsinline
        muted
        class="main-video"
      ></video>

      <template v-else>
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          webkit-playsinline
          class="main-video"
        />
        <audio
          v-if="canSpeak && localStream"
          ref="localAudio"
          autoplay
          muted
          :srcObject="localStream"
        />
      </template>

      <!-- Floating Reactions Layer -->
      <div class="reactions-layer" ref="reactionsLayer"></div>
    </div>

    <!-- Host Profile Bar (visible to viewers) -->
    <div v-if="!isHost && hostInfo.username" class="host-bar" @click="goToHostProfile">
      <div class="host-avatar">{{ hostInfo.initial }}</div>
      <div class="host-info">
        <div class="host-name">{{ hostInfo.username }}</div>
        <div class="host-label">Host</div>
      </div>
      <span class="host-chevron">›</span>
    </div>

    <!-- Reaction Bar -->
    <div class="reaction-bar">
      <button
        v-for="emoji in ['❤️', '👍', '😂', '🔥', '👏', '😮']"
        :key="emoji"
        class="reaction-btn"
        @click="sendReaction(emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <!-- Viewer List Drawer -->
    <div v-if="showViewerList" class="viewer-drawer" @click.self="showViewerList = false">
      <div class="viewer-card">
        <div class="viewer-head">
          <div class="viewer-title">👥 Viewers ({{ viewerCount }})</div>
          <button class="x" @click="showViewerList = false">✕</button>
        </div>
        <div class="viewer-list">
          <div v-if="!viewerList.length" class="viewer-empty">No viewers yet</div>
          <div v-for="v in viewerList" :key="v.socketId" class="viewer-row">
            <div class="viewer-avatar">{{ v.initial }}</div>
            <div class="viewer-name">{{ v.username }}</div>
            <span v-if="v.userId === hostInfo.userId" class="host-badge">HOST</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Toasts -->
    <div class="notification-stack">
      <transition-group name="notif">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notification"
          :class="n.type"
        >
          <span v-if="n.type === 'join'" class="notif-dot join"></span>
          <span v-else-if="n.type === 'leave'" class="notif-dot leave"></span>
          <span v-else-if="n.type === 'reaction'" class="notif-dot reaction"></span>
          {{ n.message }}
        </div>
      </transition-group>
    </div>

    <!-- Controls -->
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
      <div v-for="req in micRequests" :key="req.fromUserId" class="req-row">
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
        <input v-model="chatText" placeholder="Say something..." maxlength="200" />
        <button type="submit" :disabled="!chatText.trim()">Send</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick, computed } from "vue";
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
const reactionsLayer = ref(null);

// State
const viewerCount = ref(0);
const viewerList = ref([]);
const showViewerList = ref(false);
const chat = ref([]);
const chatText = ref("");
const micRequests = ref([]);
const canSpeak = ref(false);
const connectionState = ref("new");
const isJoining = ref(false);
const notifications = ref([]);
const hostInfo = ref({ username: '', userId: null, initial: '?' });

// Timer
const liveStartTime = ref(Date.now());
const elapsedSeconds = ref(0);
let timerInterval = null;

const streamDuration = computed(() => {
  const h = Math.floor(elapsedSeconds.value / 3600);
  const m = Math.floor((elapsedSeconds.value % 3600) / 60);
  const s = elapsedSeconds.value % 60;
  const parts = [];
  if (h > 0) parts.push(String(h).padStart(2, '0'));
  parts.push(String(m).padStart(2, '0'));
  parts.push(String(s).padStart(2, '0'));
  return `Live • ${parts.join(':')}`;
});

// WebRTC state
let pc = null;
let localStream = null;
let remoteStream = null;
let hostSocketId = null;
let makingOffer = false;
let ignoreOffer = false;
let polite = !isHost;

/* ================= ICE SERVERS ================= */
async function getIceServers() {
  try {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const res = await fetch(`${base}/api/turn`);
    const data = await res.json();
    return data?.iceServers?.length ? data.iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

/* ================= PEER CONNECTION ================= */
async function ensurePeer() {
  if (pc) return pc;
  pc = new RTCPeerConnection({ iceServers: await getIceServers() });

  pc.onconnectionstatechange = () => {
    connectionState.value = pc.connectionState;
    if (pc.connectionState === "failed") {
      setTimeout(() => { if (pc?.connectionState === "failed") reconnect(); }, 2000);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE state:", pc.iceConnectionState);
  };

  pc.ontrack = (event) => {
    if (!remoteStream) remoteStream = new MediaStream();
    const existing = remoteStream.getTracks().filter(t => t.kind === event.track.kind);
    existing.forEach(t => remoteStream.removeTrack(t));
    remoteStream.addTrack(event.track);
    if (remoteVideo.value) remoteVideo.value.srcObject = remoteStream;
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate || !hostSocketId) return;
    socket.emit("webrtc:ice", { liveId, to: hostSocketId, candidate: event.candidate });
  };

  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      socket.emit("webrtc:offer", { liveId, to: hostSocketId, offer: pc.localDescription });
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
    if (localVideo.value) localVideo.value.srcObject = localStream;
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
    if (canSpeak.value && !localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    }
    if (polite) {
      const offer = await peer.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      socket.emit("webrtc:offer", { liveId, to: hostSocketId, offer });
    }
  } catch (err) {
    console.error("Connect viewer failed:", err);
  } finally {
    isJoining.value = false;
  }
}

/* ================= RENEGOTIATE ================= */
async function renegotiate() {
  if (!pc || !hostSocketId) return;
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    socket.emit("webrtc:offer", { liveId, to: hostSocketId, offer: pc.localDescription });
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
  socket.emit("live:chat", { liveId, message: value });
  chatText.value = "";
}

watch(chat, () => {
  nextTick(() => {
    if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
  });
}, { deep: true });

/* ================= MIC MANAGEMENT ================= */
function requestMic() { socket.emit("live:mic:request", { liveId }); }
function revokeMic() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (pc) {
    pc.getSenders().forEach(sender => { if (sender.track?.kind === "audio") pc.removeTrack(sender); });
  }
  canSpeak.value = false;
  socket.emit("live:mic:revoke", { liveId });
}

function approveMic(req) {
  socket.emit("live:mic:approve", { liveId, userId: req.fromUserId });
  micRequests.value = micRequests.value.filter(x => String(x.fromUserId) !== String(req.fromUserId));
}

function denyMic(req) {
  socket.emit("live:mic:deny", { liveId, userId: req.fromUserId, reason: "Host denied request" });
  micRequests.value = micRequests.value.filter(x => String(x.fromUserId) !== String(req.fromUserId));
}

/* ================= REACTIONS ================= */
function sendReaction(emoji) {
  socket.emit("live:reaction", { liveId, emoji });
}

function spawnFloatingReaction(emoji, username) {
  const layer = reactionsLayer.value;
  if (!layer) return;
  
  const el = document.createElement('div');
  el.className = 'floating-reaction';
  el.textContent = emoji;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.animationDuration = `${2 + Math.random() * 2}s`;
  layer.appendChild(el);
  
  setTimeout(() => el.remove(), 4000);
}

/* ================= NOTIFICATIONS ================= */
function pushNotification(notification) {
  const id = `${Date.now()}-${Math.random()}`;
  const n = { ...notification, id };
  notifications.value.push(n);
  setTimeout(() => {
    notifications.value = notifications.value.filter(x => x.id !== id);
  }, 3500);
}

/* ================= HOST PROFILE ================= */
function goToHostProfile() {
  if (hostInfo.value.userId) {
    router.push(`/profile/${hostInfo.value.userId}`);
  }
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
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (remoteStream) { remoteStream.getTracks().forEach(t => t.stop()); remoteStream = null; }
  if (pc) {
    pc.ontrack = null; pc.onicecandidate = null; pc.onnegotiationneeded = null;
    pc.onconnectionstatechange = null; pc.close(); pc = null;
  }
  hostSocketId = null;
  connectionState.value = "closed";
  clearInterval(timerInterval);
}

async function reconnect() {
  console.log("Attempting reconnect...");
  cleanup();
  if (!isHost && hostSocketId) await connectViewerToHost();
}

/* ================= SOCKET HANDLERS ================= */
async function onLiveHost(payload) {
  hostSocketId = payload?.hostSocketId || null;
  if (payload?.hostSocketId && !isHost) {
    // Try to get host user info from viewer list later, or store it
  }
  if (!isHost && hostSocketId) await connectViewerToHost();
}

function onLivePresence(payload) {
  viewerCount.value = Number(payload?.viewerCount || 0);
  if (Array.isArray(payload?.viewers)) {
    viewerList.value = payload.viewers;
  }
}

function onLiveChat(payload) {
  chat.value.push({ ...payload, id: Date.now() + Math.random() });
}

function onMicRequested(payload) {
  if (!isHost) return;
  const exists = micRequests.value.some(r => String(r.fromUserId) === String(payload.fromUserId));
  if (!exists) micRequests.value.unshift(payload);
}

async function onMicStatus(payload) {
  const newCanSpeak = !!payload?.canSpeak;
  if (newCanSpeak && !canSpeak.value) {
    canSpeak.value = true;
    await connectViewerToHost();
  } else if (!newCanSpeak && canSpeak.value) {
    revokeMic();
  }
}

function onNotification(payload) {
  pushNotification(payload);
}

function onReaction(payload) {
  spawnFloatingReaction(payload.emoji, payload.username);
  pushNotification({
    type: 'reaction',
    message: `${payload.username || 'Someone'} reacted ${payload.emoji}`,
  });
}

// Perfect negotiation
async function onOffer({ offer, from }) {
  if (isHost) hostSocketId = from;
  const peer = await ensurePeer();
  const readyForOffer = !makingOffer && (pc.signalingState === "stable" || isSettingRemoteAnswerPending);
  const offerCollision = offer.type === "offer" && !readyForOffer;
  ignoreOffer = !polite && offerCollision;
  if (ignoreOffer) { console.log("Ignoring colliding offer"); return; }

  isSettingRemoteAnswerPending = offer.type === "answer";
  await peer.setRemoteDescription(offer);
  isSettingRemoteAnswerPending = false;

  if (offer.type === "offer") {
    if (isHost && !localStream) await createHostStream();
    if (isHost && localStream) {
      const existingKinds = new Set(peer.getSenders().map(s => s.track?.kind));
      localStream.getTracks().forEach((track) => {
        if (!existingKinds.has(track.kind)) peer.addTrack(track, localStream);
      });
    }
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("webrtc:answer", { liveId, to: from, answer });
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
  try { await pc.addIceCandidate(candidate); }
  catch (err) { if (!ignoreOffer) console.error("ICE error:", err); }
}

function onLiveEnded() { cleanup(); router.back(); }

/* ================= MOUNT / UNMOUNT ================= */
onMounted(async () => {
  refreshSocketAuth();

  socket.on("live:host", onLiveHost);
  socket.on("live:presence", onLivePresence);
  socket.on("live:chat", onLiveChat);
  socket.on("live:mic:requested", onMicRequested);
  socket.on("live:mic:status", onMicStatus);
  socket.on("live:notification", onNotification);
  socket.on("live:reaction", onReaction);
  socket.on("webrtc:offer", onOffer);
  socket.on("webrtc:answer", onAnswer);
  socket.on("webrtc:ice", onIce);
  socket.on("live:ended", onLiveEnded);

  if (isHost) {
    await createHostStream();
    socket.emit("live:create", { liveId });
    liveStartTime.value = Date.now();
  } else {
    socket.emit("live:join", { liveId });
  }

  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - liveStartTime.value) / 1000);
  }, 1000);
});

onBeforeUnmount(() => {
  socket.off("live:host", onLiveHost);
  socket.off("live:presence", onLivePresence);
  socket.off("live:chat", onLiveChat);
  socket.off("live:mic:requested", onMicRequested);
  socket.off("live:mic:status", onMicStatus);
  socket.off("live:notification", onNotification);
  socket.off("live:reaction", onReaction);
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

.title {
  font-weight: 900;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
  animation: pulseDot 1.5s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

.sub {
  opacity: 0.75;
  font-size: 13px;
  margin-top: 2px;
}

.live-timer {
  font-weight: 700;
  color: #fca5a5;
  letter-spacing: 0.02em;
}

.pill {
  background: rgba(255,255,255,0.1);
  padding: 10px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill:hover {
  background: rgba(255,255,255,0.18);
}

.pill.warn {
  background: #f59e0b;
  color: #000;
}

.right {
  display: flex;
  gap: 8px;
  align-items: center;
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

/* Reactions Layer */
.reactions-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

/* Floating Reaction Animation */
:global(.floating-reaction) {
  position: absolute;
  bottom: 20px;
  font-size: 28px;
  animation: floatUp linear forwards;
  opacity: 0;
  pointer-events: none;
  z-index: 20;
}

@keyframes floatUp {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  15% { transform: translateY(-20px) scale(1.1); opacity: 1; }
  85% { transform: translateY(-200px) scale(1); opacity: 1; }
  100% { transform: translateY(-260px) scale(0.8); opacity: 0; }
}

/* Host Bar */
.host-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.host-bar:hover {
  background: rgba(255,255,255,0.1);
  transform: translateX(2px);
}

.host-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
}

.host-info { flex: 1; }
.host-name { font-weight: 800; font-size: 14px; }
.host-label { opacity: 0.6; font-size: 12px; margin-top: 1px; }
.host-chevron { opacity: 0.5; font-size: 18px; }

/* Reaction Bar */
.reaction-bar {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.reaction-btn {
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: white;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reaction-btn:hover {
  transform: scale(1.15);
  background: rgba(255,255,255,0.12);
}

.reaction-btn:active {
  transform: scale(0.95);
}

/* Viewer Drawer */
.viewer-drawer {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0,0,0,0.5);
  display: grid;
  place-items: end center;
}

.viewer-card {
  width: min(480px, 100%);
  background: rgba(12, 18, 32, 0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px 24px 0 0;
  padding: 20px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.viewer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.viewer-title { font-weight: 900; font-size: 16px; }

.x {
  border: none;
  background: rgba(255,255,255,0.1);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
}

.viewer-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.viewer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
}

.viewer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
}

.viewer-name { flex: 1; font-weight: 600; font-size: 14px; }

.viewer-empty {
  text-align: center;
  opacity: 0.5;
  padding: 20px;
}

.host-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

/* Notification Stack */
.notification-stack {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.notification {
  background: rgba(12, 18, 32, 0.95);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.notif-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.notif-dot.join { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
.notif-dot.leave { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.notif-dot.reaction { background: #ec4899; box-shadow: 0 0 8px rgba(236,72,153,0.5); }

/* Notification transitions */
.notif-enter-active,
.notif-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.notif-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}

.notif-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

/* Controls */
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

/* Host Panel */
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

/* Chat */
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