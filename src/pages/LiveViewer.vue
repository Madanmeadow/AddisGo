<template>
  <div class="live">
    <h2>Watching Live</h2>

    <div class="video-container">
      <video 
        ref="remoteVideo" 
        autoplay 
        playsinline 
        :controls="false"
        class="video"
        :class="{ 'video--ended': ended }"
      ></video>
      <div v-if="connectionState !== 'connected' && joined" class="video-overlay">
        <span class="state-badge" :class="connectionState">
          {{ connectionState === 'connecting' ? 'Connecting...' : connectionState }}
        </span>
      </div>
    </div>

    <div class="row">
      <input 
        v-model="liveId" 
        placeholder="Enter Live ID" 
        :disabled="joined"
        @keydown.enter="joinLive"
      />
      <button @click="joinLive" :disabled="joined || !liveId.trim()">Join</button>
      <button @click="leaveLive" :disabled="!joined">Leave</button>
      <div class="viewer-pill">
        <span class="dot" :class="{ live: joined }"></span>
        {{ viewerCount }} viewers
      </div>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
      <button class="close" @click="error = null">×</button>
    </div>

    <div v-if="ended" class="ended">🔴 Live ended.</div>

    <div class="chat">
      <div class="messages" ref="chatScroll">
        <div 
          v-for="msg in chat" 
          :key="msg.id" 
          class="msg"
          :class="{ 'msg--self': msg.isSelf }"
        >
          <b>{{ msg.from?.username || "Anon" }}:</b> {{ msg.message }}
        </div>
        <div v-if="!chat.length" class="empty">No messages yet...</div>
      </div>
      <div class="input">
        <input 
          v-model="chatText" 
          placeholder="Say something..." 
          :disabled="!joined"
          @keydown.enter="sendChat" 
        />
        <button @click="sendChat" :disabled="!joined || !chatText.trim()">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, nextTick, watch } from "vue";
import { createSocket } from "@/realtime/socket";

const token = localStorage.getItem("token");
const socket = createSocket(token);

// DOM refs
const remoteVideo = ref(null);
const chatScroll = ref(null);

// State
const liveId = ref("");
const joined = ref(false);
const ended = ref(false);
const viewerCount = ref(0);
const connectionState = ref("new");
const error = ref(null);

const chat = ref([]);
const chatText = ref("");

// WebRTC state
let pc = null;
let iceCandidateBuffer = [];
let isSettingRemoteDescription = false;
let hostSocketId = null;

/* ================= ICE SERVERS ================= */
function getIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USER;
  const turnPass = import.meta.env.VITE_TURN_PASS;
  
  if (turnUrl && turnUser && turnPass) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnPass,
    });
  }
  
  return servers;
}

/* ================= PEER CONNECTION ================= */
function createPeerConnection(targetHostId) {
  // Clean up existing
  if (pc) {
    pc.close();
    iceCandidateBuffer = [];
  }

  pc = new RTCPeerConnection({
    iceServers: getIceServers(),
  });

  connectionState.value = "connecting";

  // Connection state monitoring
  pc.onconnectionstatechange = () => {
    connectionState.value = pc.connectionState;
    console.log("Connection state:", pc.connectionState);
    
    if (pc.connectionState === "failed") {
      error.value = "Connection failed. Retrying...";
      scheduleReconnect();
    } else if (pc.connectionState === "connected") {
      error.value = null;
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE state:", pc.iceConnectionState);
  };

  // Track handling with stream management
  pc.ontrack = (e) => {
    console.log("📡 Track received:", e.track.kind);
    
    const [stream] = e.streams;
    if (remoteVideo.value && stream) {
      remoteVideo.value.srcObject = stream;
    }
  };

  // ICE candidates
  pc.onicecandidate = (e) => {
    if (e.candidate && hostSocketId) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: hostSocketId,
        candidate: e.candidate,
      });
    }
  };

  return pc;
}

/* ================= ICE BUFFERING ================= */
async function flushIceCandidates() {
  if (!pc || iceCandidateBuffer.length === 0) return;
  
  const candidates = [...iceCandidateBuffer];
  iceCandidateBuffer = [];
  
  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("Failed to add buffered ICE candidate:", err);
    }
  }
}

/* ================= JOIN / LEAVE ================= */
function joinLive() {
  const id = liveId.value.trim();
  if (!id || joined.value) return;
  
  error.value = null;
  ended.value = false;
  
  socket.emit("live:join", { liveId: id }, (response) => {
    if (response?.error) {
      error.value = response.error;
      return;
    }
    joined.value = true;
    // Wait for host to send offer via webrtc:offer
  });
}

function leaveLive() {
  if (!joined.value) return;
  
  socket.emit("live:leave", { liveId: liveId.value });
  cleanup();
  joined.value = false;
  ended.value = false;
  hostSocketId = null;
}

function cleanup() {
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.close();
    pc = null;
  }
  iceCandidateBuffer = [];
  connectionState.value = "new";
  
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = null;
  }
}

let reconnectTimer = null;
function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (joined.value && !ended.value && pc?.connectionState === "failed") {
      console.log("Attempting reconnect...");
      cleanup();
      // Re-join will trigger host to send new offer
      socket.emit("live:join", { liveId: liveId.value });
    }
  }, 3000);
}

/* ================= CHAT ================= */
function sendChat() {
  const msg = chatText.value.trim();
  if (!msg || !joined.value) return;
  
  // Optimistic local echo
  chat.value.push({
    id: Date.now(),
    from: { username: "You" },
    message: msg,
    isSelf: true,
    liveId: liveId.value,
  });
  
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
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

/* ================= SOCKET HANDLERS ================= */
const handlers = {
  "live:presence": ({ liveId: id, viewerCount: c }) => {
    if (id === liveId.value) viewerCount.value = c;
  },

  "live:chat": (m) => {
    if (m.liveId === liveId.value && !m.isSelf) {
      chat.value.push({ ...m, id: Date.now() + Math.random() });
    }
  },

  "live:ended": ({ liveId: id }) => {
    if (id === liveId.value) {
      ended.value = true;
      cleanup();
      joined.value = false;
      hostSocketId = null;
    }
  },

  "live:host": ({ liveId: id, hostSocketId: hsid }) => {
    if (id === liveId.value) {
      hostSocketId = hsid;
    }
  },

  "webrtc:offer": async ({ from, offer }) => {
    if (!joined.value) return;
    
    // Prevent processing offer if we're already handling one
    if (isSettingRemoteDescription) {
      console.warn("Already setting remote description, ignoring offer");
      return;
    }

    try {
      isSettingRemoteDescription = true;
      hostSocketId = from;

      // Create new PC or reuse existing for renegotiation
      if (!pc || pc.signalingState === "closed") {
        createPeerConnection(from);
      }

      await pc.setRemoteDescription(offer);
      
      // Flush buffered ICE candidates
      await flushIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc:answer", {
        liveId: liveId.value,
        to: from,
        answer: pc.localDescription,
      });
    } catch (err) {
      console.error("Offer handling failed:", err);
      error.value = "Failed to connect to stream";
    } finally {
      isSettingRemoteDescription = false;
    }
  },

  "webrtc:ice": async ({ candidate }) => {
    if (!pc) {
      // Buffer until PC is ready
      if (candidate) iceCandidateBuffer.push(candidate);
      return;
    }
    
    // If remote description isn't set yet, buffer
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      if (candidate) iceCandidateBuffer.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("ICE error:", err);
    }
  },
};

/* ================= LIFECYCLE ================= */
onMounted(() => {
  // Register all handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });
});

onBeforeUnmount(() => {
  // Clean remove all handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.off(event, handler);
  });
  
  clearTimeout(reconnectTimer);
  leaveLive();
  // DO NOT call socket.disconnect() — shared socket
});
</script>

<style scoped>
.live { 
  padding: 16px; 
  max-width: 800px; 
  margin: 0 auto; 
}

.video-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.video { 
  width: 100%; 
  display: block;
  min-height: 300px;
}

.video--ended {
  opacity: 0.3;
}

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
}

.state-badge {
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,0.2);
  font-weight: 600;
  text-transform: capitalize;
}

.state-badge.connecting { background: #f59e0b; color: #000; }
.state-badge.failed { background: #ef4444; }
.state-badge.disconnected { background: #6b7280; }

.row { 
  display: flex; 
  gap: 10px; 
  align-items: center; 
  flex-wrap: wrap; 
  margin: 12px 0; 
}

.viewer-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  font-size: 14px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.dot.live {
  background: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  margin: 12px 0;
  color: #fca5a5;
}

.error-banner .close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.ended { 
  padding: 16px; 
  border-radius: 12px; 
  background: rgba(239, 68, 68, 0.12); 
  text-align: center;
  font-weight: 600;
}

.chat { 
  margin-top: 16px; 
}

.messages { 
  border: 1px solid rgba(255,255,255,.12); 
  border-radius: 12px; 
  padding: 12px; 
  min-height: 160px;
  max-height: 300px;
  overflow-y: auto;
}

.msg {
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.msg--self {
  color: #22c55e;
}

.empty {
  text-align: center;
  opacity: 0.5;
  padding: 20px;
}

.input { 
  display: flex; 
  gap: 10px; 
  margin-top: 10px; 
}

input { 
  flex: 1; 
  padding: 10px; 
  border-radius: 10px; 
  border: 1px solid rgba(255,255,255,.12); 
  background: transparent; 
  color: inherit; 
}

input:disabled {
  opacity: 0.5;
}

button {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  font-weight: 500;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}
</style>