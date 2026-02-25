<template>
  <div class="dash">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand">
        <div class="logo">🔥</div>
        <div class="meta">
          <div class="title">AddisGo</div>
          <div class="sub">Social • Live • Calls • Chat</div>
        </div>
      </div>

      <div class="me">
        <div class="avatar">{{ initials(me?.display_name || me?.email || "U") }}</div>
        <div class="meinfo">
          <div class="name">{{ me?.display_name || "User" }}</div>
          <div class="status">
            <span class="dot" :class="{ on: socketConnected }"></span>
            <span>{{ socketConnected ? "Connected" : "Connecting..." }}</span>
            <span class="sep">•</span>
            <span class="muted">ID {{ me?.id ?? "?" }}</span>
          </div>
        </div>

        <button class="btn danger" @click="logout">Logout</button>
      </div>

      <div class="section">
        <div class="section-title">
          <span>🟢 People</span>
          <button class="btn ghost small" @click="refreshPresence">Refresh</button>
        </div>

        <div class="people">
          <div
            v-for="u in people"
            :key="u.id"
            class="person"
            :class="{ active: selectedUser?.id === u.id }"
            @click="selectedUser = u"
          >
            <div class="pavatar">{{ initials(u.display_name || u.email || "U") }}</div>
            <div class="pinfo">
              <div class="pname">{{ u.display_name || u.email || ("User " + u.id) }}</div>
              <div class="pstatus">
                <span class="dot" :class="{ on: isOnline(u.id) }"></span>
                <span>{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                <span class="sep">•</span>
                <span class="muted">ID {{ u.id }}</span>
              </div>
            </div>

            <div class="actions">
              <button
                class="iconbtn"
                :disabled="!isOnline(u.id) || callState.busy"
                title="Audio call"
                @click.stop="startCall(u, 'audio')"
              >
                📞
              </button>
              <button
                class="iconbtn"
                :disabled="!isOnline(u.id) || callState.busy"
                title="Video call"
                @click.stop="startCall(u, 'video')"
              >
                🎥
              </button>
            </div>
          </div>

          <div class="hint" v-if="people.length === 0">
            No users loaded yet.
            <div class="muted">Tip: load your users list from your API.</div>
          </div>
        </div>

        <div class="tip">
          Tip: calls require both users to be online (green).
        </div>
      </div>

      <div class="section">
        <div class="section-title">⚡ Quick Actions</div>
        <button class="btn block" @click="scrollTop">Scroll Top</button>
        <button class="btn block" @click="sidebarCollapsed = !sidebarCollapsed">
          {{ sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar" }}
        </button>
      </div>
    </aside>

    <!-- MAIN -->
    <main class="main">
      <header class="topbar">
        <div class="left">
          <div class="h1">Dashboard</div>
          <div class="h2">Modern real-time calls (audio + video) built into AddisGo</div>
        </div>
        <div class="right">
          <div class="pill" :class="{ ok: socketConnected }">
            <span class="dot" :class="{ on: socketConnected }"></span>
            <span>{{ socketConnected ? "Live Socket" : "Offline Socket" }}</span>
          </div>
        </div>
      </header>

      <section class="grid">
        <!-- Call Panel -->
        <div class="card">
          <div class="card-title">📞 Calls</div>

          <div class="row">
            <div class="muted">
              Selected:
              <b>{{ selectedUser?.display_name || selectedUser?.email || (selectedUser ? "User " + selectedUser.id : "None") }}</b>
            </div>
            <div class="muted">
              Status:
              <b>{{ callState.busy ? callState.stage : "idle" }}</b>
            </div>
          </div>

          <div class="row buttons">
            <button
              class="btn primary"
              :disabled="!selectedUser || !isOnline(selectedUser.id) || callState.busy"
              @click="startCall(selectedUser, 'audio')"
            >
              Start Audio
            </button>

            <button
              class="btn primary"
              :disabled="!selectedUser || !isOnline(selectedUser.id) || callState.busy"
              @click="startCall(selectedUser, 'video')"
            >
              Start Video
            </button>

            <button class="btn" :disabled="!callState.busy" @click="endCall">
              End Call
            </button>
          </div>

          <div class="muted mt12">
            If “Calling…” appears but nothing happens, it means the server didn’t route the call.
            This dashboard auto-registers your socket with <code>user:online</code> on connect.
          </div>
        </div>

        <!-- Media Panel -->
        <div class="card">
          <div class="card-title">🎛 Media</div>
          <div class="videos">
            <div class="vbox">
              <div class="vlabel">Local</div>
              <video ref="localVideo" autoplay playsinline muted></video>
            </div>
            <div class="vbox">
              <div class="vlabel">Remote</div>
              <video ref="remoteVideo" autoplay playsinline></video>
            </div>
          </div>

          <div class="row mt12">
            <button class="btn" :disabled="!callState.busy" @click="toggleMute">
              {{ media.muted ? "Unmute" : "Mute" }}
            </button>
            <button class="btn" :disabled="!callState.busy || callState.kind !== 'video'" @click="toggleCamera">
              {{ media.cameraOff ? "Camera On" : "Camera Off" }}
            </button>
          </div>

          <div class="muted mt12">
            Audio works for both audio/video calls. Video only when call kind = video.
          </div>
        </div>
      </section>

      <!-- Small toast -->
      <div v-if="toast.text" class="toast" :class="toast.type">
        {{ toast.text }}
        <button class="toastx" @click="toast.text = ''">✕</button>
      </div>
    </main>

    <!-- OUTGOING CALL BAR -->
    <div v-if="callState.stage === 'calling'" class="callbar">
      <div class="callbar-left">
        <b>Calling</b>
        <span class="muted">
          {{ callState.toName }} ({{ callState.kind }})
        </span>
      </div>
      <button class="btn danger small" @click="cancelCall">Cancel</button>
    </div>

    <!-- INCOMING CALL MODAL -->
    <div v-if="incoming.visible" class="modal-backdrop">
      <div class="modal">
        <div class="modal-title">Incoming {{ incoming.kind }} call</div>
        <div class="modal-body">
          <div class="muted">
            From user ID <b>{{ incoming.fromUserId }}</b>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn" @click="rejectIncoming">Reject</button>
          <button class="btn primary" @click="acceptIncoming">Accept</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { io } from "socket.io-client";

/* =========================================
   CONFIG
========================================= */
const API_BASE = import.meta.env.VITE_API_URL; // ex: https://addisgo-production-6a3e.up.railway.app

/* =========================================
   BASIC AUTH/USER (adapt to your store)
========================================= */
const me = ref(null);
const token = ref(localStorage.getItem("token") || "");

// Try to read user from localStorage if you store it
try {
  const stored = localStorage.getItem("user");
  if (stored) me.value = JSON.parse(stored);
} catch {}

/* =========================================
   UI STATE
========================================= */
const sidebarCollapsed = ref(false);
const selectedUser = ref(null);

const toast = reactive({ text: "", type: "info" });
function showToast(text, type = "info") {
  toast.text = text;
  toast.type = type;
  setTimeout(() => {
    if (toast.text === text) toast.text = "";
  }, 4000);
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

/* =========================================
   PEOPLE LIST (replace with your real API)
   For now: demo list if you don’t load users.
========================================= */
const people = ref([]);

/* Example loader: replace endpoint with your real one */
async function loadPeople() {
  // If you already have a users endpoint, use it.
  // This fallback prevents dashboard from breaking.
  // Example:
  // const res = await fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token.value}` }});
  // people.value = await res.json();

  if (!people.value.length) {
    // demo fallback (you can remove)
    people.value = [
      // put real users from your DB
      ...(me.value?.id ? [] : []),
    ];
  }
}

/* =========================================
   SOCKET
========================================= */
let socket = null;
const socketConnected = ref(false);

// Presence list from server
const onlineUserIds = ref([]);

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

function refreshPresence() {
  socket?.emit("presence:get");
}

/* =========================================
   CALL STATE
========================================= */
const callState = reactive({
  busy: false,
  stage: "idle", // idle | calling | in-call
  roomId: "",
  kind: "audio", // audio | video
  toUserId: "",
  toName: "",
});

const incoming = reactive({
  visible: false,
  roomId: "",
  fromUserId: "",
  kind: "audio",
});

/* =========================================
   WEBRTC STATE
========================================= */
const localVideo = ref(null);
const remoteVideo = ref(null);

const media = reactive({
  localStream: null,
  pc: null,
  muted: false,
  cameraOff: false,
});

const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/* =========================================
   SOCKET + WEBRTC CORE
========================================= */
function createSocket() {
  if (!API_BASE) {
    showToast("Missing VITE_API_URL", "error");
    return;
  }

  socket = io(API_BASE, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });

  socket.on("connect", () => {
    socketConnected.value = true;

    // ✅ MOST IMPORTANT: register online user
    if (me.value?.id) {
      socket.emit("user:online", { userId: me.value.id });
      socket.emit("presence:get");
    }

    showToast("Socket connected", "ok");
  });

  socket.on("disconnect", () => {
    socketConnected.value = false;
    showToast("Socket disconnected", "error");
  });

  socket.on("server:ready", () => {
    // optional
  });

  socket.on("presence:list", ({ onlineUserIds: list }) => {
    onlineUserIds.value = (list || []).map(String);
  });

  socket.on("presence:update", ({ userId, online }) => {
    const id = String(userId);
    const set = new Set(onlineUserIds.value.map(String));
    if (online) set.add(id);
    else set.delete(id);
    onlineUserIds.value = Array.from(set);
  });

  /* ===== Call Events ===== */
  socket.on("call:ringing", ({ roomId }) => {
    // caller gets this
    callState.roomId = roomId;
  });

  socket.on("call:incoming", ({ roomId, fromUserId, kind }) => {
    // callee gets this
    incoming.visible = true;
    incoming.roomId = roomId;
    incoming.fromUserId = String(fromUserId);
    incoming.kind = kind === "video" ? "video" : "audio";

    // we’re not in-call yet, just popup
    showToast(`Incoming ${incoming.kind} call`, "info");
  });

  socket.on("call:accepted", async ({ roomId }) => {
    // both sides can receive accepted
    if (!callState.busy && !incoming.visible) return;

    // If I’m caller: I should start WebRTC offer
    if (callState.stage === "calling" && callState.roomId === roomId) {
      callState.stage = "in-call";
      await startWebRTCAsCaller(roomId, callState.kind);
      showToast("Call accepted ✅", "ok");
      return;
    }

    // If I’m callee: when accepted, I start media & wait offer
    if (incoming.visible && incoming.roomId === roomId) {
      incoming.visible = false;
      callState.busy = true;
      callState.stage = "in-call";
      callState.roomId = roomId;
      callState.kind = incoming.kind;

      await prepareWebRTC(roomId, callState.kind);
      showToast("Joined call ✅", "ok");
    }
  });

  socket.on("call:ended", ({ roomId, reason }) => {
    if (callState.roomId === roomId || incoming.roomId === roomId) {
      showToast(`Call ${reason || "ended"}`, "info");
      cleanupCall();
    }
  });

  socket.on("call:error", ({ message }) => {
    showToast(message || "Call error", "error");
    cleanupCall();
  });

  /* ===== WebRTC Signaling ===== */
  socket.on("webrtc:offer", async ({ roomId, offer }) => {
    if (callState.roomId !== roomId) return;

    // callee receives offer
    await ensurePeer(roomId, callState.kind);
    await media.pc.setRemoteDescription(offer);

    const answer = await media.pc.createAnswer();
    await media.pc.setLocalDescription(answer);
    socket.emit("webrtc:answer", { roomId, answer });
  });

  socket.on("webrtc:answer", async ({ roomId, answer }) => {
    if (callState.roomId !== roomId) return;

    // caller receives answer
    await ensurePeer(roomId, callState.kind);
    await media.pc.setRemoteDescription(answer);
  });

  socket.on("webrtc:ice", async ({ roomId, candidate }) => {
    if (callState.roomId !== roomId) return;

    try {
      await media.pc?.addIceCandidate(candidate);
    } catch {
      // ignore
    }
  });
}

async function ensurePeer(roomId, kind) {
  if (media.pc) return;

  await prepareWebRTC(roomId, kind);
}

async function prepareWebRTC(roomId, kind) {
  // Create peer connection
  media.pc = new RTCPeerConnection(ICE_CONFIG);

  media.pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit("webrtc:ice", { roomId, candidate: e.candidate });
  };

  media.pc.ontrack = (e) => {
    if (remoteVideo.value) remoteVideo.value.srcObject = e.streams[0];
  };

  // Get media
  media.localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind === "video",
  });

  // Attach local stream
  if (localVideo.value) localVideo.value.srcObject = media.localStream;

  // Add tracks
  media.localStream.getTracks().forEach((t) => media.pc.addTrack(t, media.localStream));

  // Reset toggles
  media.muted = false;
  media.cameraOff = false;
}

async function startWebRTCAsCaller(roomId, kind) {
  await ensurePeer(roomId, kind);

  const offer = await media.pc.createOffer();
  await media.pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", { roomId, offer });
}

/* =========================================
   CALL ACTIONS
========================================= */
function startCall(user, kind = "audio") {
  if (!socket) return;
  if (!me.value?.id) return showToast("Login again (missing user).", "error");
  if (!isOnline(user.id)) return showToast("User is offline.", "error");
  if (callState.busy) return;

  callState.busy = true;
  callState.stage = "calling";
  callState.kind = kind === "video" ? "video" : "audio";
  callState.roomId = "";
  callState.toUserId = String(user.id);
  callState.toName = user.display_name || user.email || ("User " + user.id);

  socket.emit("call:request", { toUserId: user.id, kind: callState.kind });
}

function cancelCall() {
  if (!callState.busy) return;

  if (callState.roomId) {
    socket?.emit("call:cancel", { roomId: callState.roomId });
  }
  cleanupCall();
}

function acceptIncoming() {
  if (!incoming.visible) return;
  socket?.emit("call:accept", { roomId: incoming.roomId });
}

function rejectIncoming() {
  if (!incoming.visible) return;
  socket?.emit("call:reject", { roomId: incoming.roomId });
  incoming.visible = false;
  incoming.roomId = "";
  incoming.fromUserId = "";
}

function endCall() {
  if (!callState.roomId) return cleanupCall();
  socket?.emit("call:end", { roomId: callState.roomId });
  cleanupCall();
}

function cleanupCall() {
  // Reset incoming
  incoming.visible = false;
  incoming.roomId = "";
  incoming.fromUserId = "";

  // Reset call state
  callState.busy = false;
  callState.stage = "idle";
  callState.roomId = "";
  callState.kind = "audio";
  callState.toUserId = "";
  callState.toName = "";

  // Stop media
  try {
    media.localStream?.getTracks()?.forEach((t) => t.stop());
  } catch {}
  media.localStream = null;

  // Close peer
  try {
    media.pc?.close();
  } catch {}
  media.pc = null;

  // Clear video elements
  if (localVideo.value) localVideo.value.srcObject = null;
  if (remoteVideo.value) remoteVideo.value.srcObject = null;

  // Reset toggles
  media.muted = false;
  media.cameraOff = false;
}

/* =========================================
   MEDIA TOGGLES
========================================= */
function toggleMute() {
  if (!media.localStream) return;
  const audioTracks = media.localStream.getAudioTracks();
  if (!audioTracks.length) return;

  media.muted = !media.muted;
  audioTracks.forEach((t) => (t.enabled = !media.muted));
}

function toggleCamera() {
  if (!media.localStream) return;
  const videoTracks = media.localStream.getVideoTracks();
  if (!videoTracks.length) return;

  media.cameraOff = !media.cameraOff;
  videoTracks.forEach((t) => (t.enabled = !media.cameraOff));
}

/* =========================================
   LOGOUT
========================================= */
function logout() {
  // stop call if any
  if (callState.busy) endCall();

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  token.value = "";
  me.value = null;

  try {
    socket?.disconnect();
  } catch {}

  window.location.href = "/"; // or router.push("/login")
}

/* =========================================
   LIFECYCLE
========================================= */
onMounted(async () => {
  // If you have a store, load user from it instead
  if (!me.value) {
    // fallback: if you don’t have user stored, dashboard still loads
    showToast("No user found in localStorage. (Store user on login.)", "error");
  }

  await loadPeople();
  createSocket();

  // Optional: select first user that isn’t me
  if (!selectedUser.value && people.value.length) {
    selectedUser.value = people.value.find((u) => String(u.id) !== String(me.value?.id)) || people.value[0];
  }
});

onBeforeUnmount(() => {
  if (callState.busy) cleanupCall();
  try {
    socket?.disconnect();
  } catch {}
});

/* If user becomes available later, re-register online */
watch(
  () => me.value?.id,
  (id) => {
    if (id && socketConnected.value) {
      socket?.emit("user:online", { userId: id });
      socket?.emit("presence:get");
    }
  }
);
</script>

<style scoped>
/* ====== Layout ====== */
.dash {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 360px 1fr;
  background: #0b0f17;
  color: #e9eefb;
}

.sidebar {
  border-right: 1px solid rgba(255,255,255,0.08);
  background: radial-gradient(1200px 600px at 10% 0%, rgba(255, 0, 100, 0.10), transparent 60%),
              radial-gradient(900px 500px at 80% 30%, rgba(0, 160, 255, 0.10), transparent 60%),
              #0b0f17;
  padding: 18px;
  overflow: auto;
}
.sidebar.collapsed { width: 86px; }
.main { padding: 18px; overflow: auto; }

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
}
.logo { font-size: 26px; }
.title { font-weight: 800; font-size: 18px; }
.sub { font-size: 12px; opacity: 0.75; margin-top: 2px; }

.me {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
}
.avatar, .pavatar {
  width: 44px; height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.08);
  font-weight: 800;
}
.meinfo .name { font-weight: 700; }
.status, .pstatus { font-size: 12px; opacity: 0.8; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sep { opacity: 0.6; }
.muted { opacity: 0.7; }

.section { margin-top: 14px; }
.section-title {
  display:flex; justify-content: space-between; align-items:center;
  margin: 10px 4px;
  font-weight: 700;
  opacity: 0.95;
}

.people {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  overflow: hidden;
}
.person {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
}
.person:first-child { border-top: none; }
.person:hover { background: rgba(255,255,255,0.04); }
.person.active { background: rgba(255,255,255,0.06); }

.pname { font-weight: 700; }

.actions { display: flex; gap: 8px; }
.iconbtn {
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: #fff;
  cursor: pointer;
}
.iconbtn:disabled { opacity: 0.35; cursor: not-allowed; }

.tip {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.18);
  opacity: 0.8;
  font-size: 12px;
}

/* ====== Main ====== */
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
}
.h1 { font-size: 18px; font-weight: 800; }
.h2 { font-size: 12px; opacity: 0.75; margin-top: 3px; }

.pill {
  display: flex; gap: 8px; align-items: center;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
}
.pill.ok { border-color: rgba(0,255,140,0.25); }

.grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 1100px) {
  .dash { grid-template-columns: 1fr; }
  .grid { grid-template-columns: 1fr; }
}

.card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}
.card-title { font-weight: 800; margin-bottom: 10px; }

.row { display:flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.buttons { margin-top: 10px; }

.videos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.vbox {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 10px;
  background: rgba(0,0,0,0.25);
}
.vlabel { font-size: 12px; opacity: 0.75; margin-bottom: 8px; }
video {
  width: 100%;
  height: 240px;
  border-radius: 12px;
  background: #000;
}

/* ====== Buttons ====== */
.btn {
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: #fff;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
}
.btn:hover { background: rgba(255,255,255,0.06); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn.primary {
  border-color: rgba(255,70,70,0.35);
  background: rgba(255,70,70,0.18);
}
.btn.primary:hover { background: rgba(255,70,70,0.24); }

.btn.danger {
  border-color: rgba(255,70,70,0.4);
  background: rgba(255,70,70,0.18);
}
.btn.ghost { background: transparent; }
.btn.small { padding: 8px 10px; border-radius: 12px; font-size: 12px; }
.btn.block { width: 100%; margin-top: 10px; }

.mt12 { margin-top: 12px; }

/* ====== Dots ====== */
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display:inline-block;
}
.dot.on { background: rgba(0,255,140,0.9); }

/* ====== Toast ====== */
.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(10px);
  display:flex;
  gap: 10px;
  align-items:center;
  max-width: 420px;
}
.toast.ok { border-color: rgba(0,255,140,0.25); }
.toast.error { border-color: rgba(255,70,70,0.35); }
.toastx {
  border: none;
  background: transparent;
  color: #fff;
  opacity: 0.7;
  cursor: pointer;
}

/* ====== Callbar ====== */
.callbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 18px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(10px);
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 14px;
  width: min(560px, calc(100% - 24px));
}
.callbar-left { display:flex; flex-direction: column; gap: 2px; }

/* ====== Modal ====== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.60);
  display:grid;
  place-items:center;
  padding: 18px;
}
.modal {
  width: min(460px, 100%);
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(15,18,30,0.92);
  backdrop-filter: blur(12px);
  padding: 16px;
}
.modal-title { font-weight: 900; font-size: 16px; }
.modal-body { margin-top: 10px; }
.modal-actions { margin-top: 14px; display:flex; justify-content:flex-end; gap: 10px; }
</style>