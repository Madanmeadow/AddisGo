<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="centerTitle">
          <div class="titleRow">
            <div class="title">AddisGo Live</div>

            <span class="badge" :class="isHost ? 'host' : 'watch'">
              {{ isHost ? "HOST" : "WATCH" }}
            </span>

            <span class="badge ok" v-if="socketOk">SOCKET OK</span>
            <span class="badge ended" v-if="ended">ENDED</span>
          </div>

          <div class="metaRow">
            <span>Live ID: <b class="mono">{{ liveId }}</b></span>
            <span class="dot">•</span>
            <span>Viewers: <b class="mono">{{ viewerCount }}</b></span>
            <span class="dot">•</span>
            <span>Status: <b>{{ status }}</b></span>
            <span class="dot">•</span>
            <span>ICE: <b>{{ iceMode }}</b></span>
          </div>
        </div>

        <div class="rightBtns">
          <button class="chip" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Show Chat" }}</button>
          <button class="chip" @click="enableSoundOnce">Enable Sound</button>
        </div>
      </header>

      <section class="grid">
        <!-- VIDEO AREA -->
        <div class="card videoCard">
          <div class="controls">
            <button class="btn primary" v-if="isHost && !isLive" @click="startLive" :disabled="busy">
              Start Live
            </button>

            <button class="btn danger" v-if="isHost && isLive" @click="endLive" :disabled="busy">
              End Live
            </button>

            <button class="btn ghost" v-if="!isHost && !joined" @click="joinLive" :disabled="busy">
              Join
            </button>

            <button class="btn ghost" v-if="!isHost && joined" @click="leaveLive" :disabled="busy">
              Leave
            </button>

            <button class="btn ghost" v-if="isHost && isLive" @click="toggleMic" :disabled="!localStream">
              {{ micOn ? "Mute Mic" : "Unmute Mic" }}
            </button>

            <button class="btn ghost" v-if="isHost && isLive" @click="toggleCam" :disabled="!localStream">
              {{ camOn ? "Cam Off" : "Cam On" }}
            </button>

            <!-- viewer mic request -->
            <button class="btn ghost" v-if="!isHost && joined" @click="requestMic" :disabled="busy || canSpeak">
              🎤 Request Mic
            </button>

            <button class="btn primary" v-if="!isHost && joined" @click="startViewerMic" :disabled="busy || !canSpeak || viewerMicOn">
              Start Mic
            </button>

            <button class="btn danger" v-if="!isHost && joined" @click="stopViewerMic" :disabled="busy || !viewerMicOn">
              Stop Mic
            </button>

            <button class="btn ghost" @click="reconnect" :disabled="busy">Reconnect</button>
            <button class="btn ghost" @click="copyShare">Share</button>
          </div>

          <div class="chips">
            <span class="pill">{{ iceMode }}</span>
            <span class="pill" :class="canSpeak ? 'ok' : 'warn'">
              Mic: {{ canSpeak ? "Approved" : "Not approved" }}
            </span>
            <span class="pill warn" v-if="iceMode === 'STUN only'">
              ⚠️ TURN not available, some networks may fail
            </span>
          </div>

          <!-- MIC REQUEST POPUP (HOST) -->
          <div v-if="isHost && micRequests.length" class="reqBox">
            <div class="reqTitle">🎤 Mic Requests</div>

            <div v-for="r in micRequests" :key="r.fromUserId" class="reqRow">
              <div class="reqName">
                <b>{{ r.fromName }}</b>
                <div class="reqSub mono">user: {{ r.fromUserId }}</div>
              </div>

              <div class="reqBtns">
                <button class="mini ok" @click="approveMic(r.fromUserId)">Approve</button>
                <button class="mini no" @click="denyMic(r.fromUserId)">Deny</button>
              </div>
            </div>
          </div>

          <!-- VIDEO -->
          <div class="stage">
            <!-- HOST PREVIEW (smaller, not huge) -->
            <div v-if="isHost" class="hostPreview">
              <div class="label">You (Host)</div>
              <video ref="hostPreviewEl" class="video" autoplay muted playsinline />
            </div>

            <!-- MAIN LIVE SCREEN (viewer sees host here) -->
            <div class="mainScreen">
              <div class="label">LIVE</div>

              <video
                ref="mainVideoEl"
                class="video"
                autoplay
                playsinline
                :muted="viewerMuted"
              />

              <audio ref="mainAudioEl" autoplay />
              <div v-if="!mainHasStream" class="empty">
                <div class="big">📺</div>
                <div class="txt">
                  {{ ended ? "Live ended by host" : (joined || isHost ? "Connecting to host…" : "Tap Join to watch") }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CHAT -->
        <aside v-if="chatOpen" class="card chatCard">
          <div class="chatTitle">Live Chat</div>

          <div class="chatList">
            <div v-for="(m, i) in chat" :key="i" class="msg">
              <div class="msgTop">
                <b>{{ m.from?.username || "Anon" }}</b>
                <span class="time">{{ formatTime(m.at) }}</span>
              </div>
              <div class="msgBody">{{ m.message }}</div>
            </div>
          </div>

          <div class="chatInput">
            <input v-model="chatText" class="input" placeholder="Say hi 👋" @keydown.enter="sendChat" />
            <button class="btn primary" @click="sendChat">Send</button>
          </div>
        </aside>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { io } from "socket.io-client";
import Layout from "../components/Layout.vue";

const route = useRoute();
const apiUrl = import.meta.env.VITE_API_URL;

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();
const token = localStorage.getItem("token");

const liveId = ref(String(route.query.liveId || `live-${me?.id || "0"}-${Math.floor(Math.random()*9999)}`));
const mode = ref(String(route.query.mode || "watch")); // host|watch
const isHost = computed(() => mode.value === "host");

const socketOk = ref(false);
const busy = ref(false);
const ended = ref(false);

const isLive = ref(false);
const joined = ref(false);
const status = computed(() => {
  if (ended.value) return "ended";
  if (isHost.value) return isLive.value ? "hosting" : "idle";
  return joined.value ? "watching" : "idle";
});

const viewerCount = ref(0);

// ICE
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s =>
    String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:")
  );
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// elements
const hostPreviewEl = ref(null);
const mainVideoEl = ref(null);
const mainAudioEl = ref(null);

const viewerMuted = ref(true); // start muted to avoid autoplay block
const mainHasStream = ref(false);

// streams
let localStream = null;       // host cam+mic
let viewerMicStream = null;   // viewer mic only

const micOn = ref(true);
const camOn = ref(true);

const canSpeak = ref(false);
const viewerMicOn = ref(false);

// chat
const chatOpen = ref(true);
const chat = ref([]);
const chatText = ref("");

// mic requests (host)
const micRequests = ref([]); // [{fromUserId, fromName, fromSocketId,...}]

// WebRTC
let hostPcByViewer = new Map(); // host: viewerSocketId -> RTCPeerConnection
let viewerPc = null;            // viewer: single RTCPeerConnection to host
let hostSocketId = null;

// socket
const socket = io(apiUrl, {
  transports: ["websocket", "polling"],
  auth: token ? { token } : undefined,
});

/* =========================
   UTILS
========================= */
function toggleChat() {
  chatOpen.value = !chatOpen.value;
}

async function enableSoundOnce() {
  // iOS autoplay unlock
  try {
    const a = new Audio();
    a.src =
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    await a.play().catch(() => {});
    a.pause();
  } catch {}
  // after user gesture, we can unmute viewer
  viewerMuted.value = false;
  try { await mainVideoEl.value?.play(); } catch {}
  try { await mainAudioEl.value?.play(); } catch {}
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

async function loadIceServers() {
  try {
    let r = await fetch(`${apiUrl}/turn`);
    if (!r.ok) r = await fetch(`${apiUrl}/api/turn`);
    const data = await r.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
    }
  } catch {}
}

function copyShare() {
  const url = `${location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}`;
  navigator.clipboard?.writeText(url).catch(() => {});
  alert("Link copied ✅");
}

/* =========================
   HOST MEDIA
========================= */
async function startHostMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: { width: 1280, height: 720, frameRate: 30 },
  });

  micOn.value = true;
  camOn.value = true;

  if (hostPreviewEl.value) {
    hostPreviewEl.value.srcObject = localStream;
    try { await hostPreviewEl.value.play(); } catch {}
  }
}

function stopHostMedia() {
  if (!localStream) return;
  localStream.getTracks().forEach(t => t.stop());
  localStream = null;
}

function toggleMic() {
  if (!localStream) return;
  const t = localStream.getAudioTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;
  micOn.value = t.enabled;
}

function toggleCam() {
  if (!localStream) return;
  const t = localStream.getVideoTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;
  camOn.value = t.enabled;
}

/* =========================
   VIEWER MIC
========================= */
async function startViewerMic() {
  if (!canSpeak.value) return alert("Host must approve mic first.");
  if (viewerMicOn.value) return;

  viewerMicStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });

  viewerMicOn.value = true;

  // add mic track into viewer PC (if connected)
  if (viewerPc) {
    for (const track of viewerMicStream.getTracks()) {
      viewerPc.addTrack(track, viewerMicStream);
    }
    // renegotiate (viewer -> host)
    await renegotiateViewer();
  }
}

function stopViewerMic() {
  if (!viewerMicStream) return;
  viewerMicStream.getTracks().forEach(t => t.stop());
  viewerMicStream = null;
  viewerMicOn.value = false;
}

async function renegotiateViewer() {
  if (!viewerPc || !hostSocketId) return;
  const offer = await viewerPc.createOffer();
  await viewerPc.setLocalDescription(offer);
  socket.emit("webrtc:offer", { liveId: liveId.value, to: hostSocketId, offer: viewerPc.localDescription });
}

/* =========================
   WEBRTC (HOST SIDE)
========================= */
function createHostPc(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

  // host sends cam+mic to viewer
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.emit("webrtc:ice", { liveId: liveId.value, to: viewerSocketId, candidate: e.candidate });
  };

  // host receives viewer mic (if approved and viewer sends)
  pc.ontrack = (e) => {
    // optional: you can play viewer audio on host if you want.
    // For now, keep simple (not required).
  };

  hostPcByViewer.set(viewerSocketId, pc);
  return pc;
}

async function hostOfferToViewer(viewerSocketId) {
  const pc = hostPcByViewer.get(viewerSocketId) || createHostPc(viewerSocketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("webrtc:offer", { liveId: liveId.value, to: viewerSocketId, offer: pc.localDescription });
}

function closeHostAll() {
  for (const pc of hostPcByViewer.values()) {
    try { pc.close(); } catch {}
  }
  hostPcByViewer = new Map();
}

/* =========================
   WEBRTC (VIEWER SIDE)
========================= */
function createViewerPc() {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.emit("webrtc:ice", { liveId: liveId.value, to: hostSocketId, candidate: e.candidate });
  };

  pc.ontrack = async (e) => {
    const stream = e.streams?.[0];
    if (!stream) return;

    mainHasStream.value = true;

    // attach stream to both video+audio
    if (mainVideoEl.value) {
      mainVideoEl.value.srcObject = stream;
      try { await mainVideoEl.value.play(); } catch {}
    }
    if (mainAudioEl.value) {
      mainAudioEl.value.srcObject = stream;
      try { await mainAudioEl.value.play(); } catch {}
    }
  };

  viewerPc = pc;
  return pc;
}

function closeViewerPc() {
  try { viewerPc?.close(); } catch {}
  viewerPc = null;
  mainHasStream.value = false;
  if (mainVideoEl.value) mainVideoEl.value.srcObject = null;
  if (mainAudioEl.value) mainAudioEl.value.srcObject = null;
}

/* =========================
   ACTIONS
========================= */
async function startLive() {
  busy.value = true;
  ended.value = false;

  try {
    await loadIceServers();
    await startHostMedia();

    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("live:create", { liveId: liveId.value });
    isLive.value = true;
  } catch (e) {
    console.error(e);
    alert("Could not start live. Check camera/mic permissions.");
  } finally {
    busy.value = false;
  }
}

async function joinLive() {
  busy.value = true;
  ended.value = false;

  try {
    await loadIceServers();

    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("live:join", { liveId: liveId.value });
    joined.value = true;
  } finally {
    busy.value = false;
  }
}

function leaveLive() {
  try { socket.emit("live:leave", { liveId: liveId.value }); } catch {}
  joined.value = false;
  canSpeak.value = false;
  stopViewerMic();
  closeViewerPc();
}

function endLive() {
  ended.value = true;
  isLive.value = false;
  try { socket.emit("live:end", { liveId: liveId.value }); } catch {}
  closeHostAll();
  stopHostMedia();
}

async function reconnect() {
  busy.value = true;
  try {
    // viewer
    if (!isHost.value) {
      closeViewerPc();
      joined.value = false;
      await joinLive();
    } else {
      // host: re-offer to viewers (simple)
      closeHostAll();
      // viewers will rejoin / or you can keep their socket ids if you track them
      alert("Reconnected ✅ (viewers may need to rejoin)");
    }
  } finally {
    busy.value = false;
  }
}

/* =========================
   MIC REQUEST FLOW
========================= */
function requestMic() {
  if (!joined.value) return alert("Join first.");
  socket.emit("live:mic:request", { liveId: liveId.value });
}

function approveMic(userId) {
  socket.emit("live:mic:approve", { liveId: liveId.value, userId });
  micRequests.value = micRequests.value.filter(r => String(r.fromUserId) !== String(userId));
}

function denyMic(userId) {
  socket.emit("live:mic:deny", { liveId: liveId.value, userId, reason: "denied" });
  micRequests.value = micRequests.value.filter(r => String(r.fromUserId) !== String(userId));
}

/* =========================
   CHAT
========================= */
function sendChat() {
  const msg = String(chatText.value || "").trim();
  if (!msg) return;
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

/* =========================
   SOCKET EVENTS
========================= */
socket.on("connect", () => (socketOk.value = true));
socket.on("disconnect", () => (socketOk.value = false));

socket.on("live:presence", ({ viewerCount: n }) => {
  viewerCount.value = Number(n || 0);
});

socket.on("live:host", ({ hostSocketId: hs }) => {
  hostSocketId = hs || null;

  // viewer prepares pc once host socket known
  if (!isHost.value && joined.value && hostSocketId) {
    if (!viewerPc) createViewerPc();
  }
});

// viewer joined (host must OFFER -> this fixes dark screen)
socket.on("live:viewer-joined", async ({ viewerSocketId }) => {
  if (!isHost.value) return;
  if (!isLive.value) return;
  if (!viewerSocketId) return;

  try {
    await hostOfferToViewer(viewerSocketId);
  } catch (e) {
    console.error("offer to viewer failed", e);
  }
});

socket.on("live:viewer-left", ({ viewerSocketId }) => {
  if (!isHost.value) return;
  const pc = hostPcByViewer.get(viewerSocketId);
  if (pc) {
    try { pc.close(); } catch {}
    hostPcByViewer.delete(viewerSocketId);
  }
});

socket.on("live:ended", () => {
  ended.value = true;
  isLive.value = false;
  joined.value = false;

  closeHostAll();
  stopHostMedia();
  stopViewerMic();
  closeViewerPc();
});

// host receives mic request popup (THIS is your missing piece)
socket.on("live:mic:requested", (payload) => {
  if (!isHost.value) return;
  if (!payload?.fromUserId) return;

  // dedupe
  micRequests.value = micRequests.value.filter(x => String(x.fromUserId) !== String(payload.fromUserId));
  micRequests.value.unshift(payload);
});

// viewer receives approval
socket.on("live:mic:approved", ({ ok }) => {
  if (ok) canSpeak.value = true;
});

socket.on("live:mic:denied", () => {
  canSpeak.value = false;
});

// viewer status (when joining)
socket.on("live:mic:status", ({ canSpeak: cs }) => {
  canSpeak.value = !!cs;
});

// chat
socket.on("live:chat", (m) => {
  chat.value.push(m);
  if (chat.value.length > 200) chat.value.shift();
});

/* ===== WebRTC relay events ===== */
socket.on("webrtc:offer", async ({ liveId: lid, from, offer }) => {
  if (String(lid) !== String(liveId.value)) return;
  if (!offer || !from) return;

  // viewer: receive offer from host
  if (!isHost.value) {
    hostSocketId = from;
    const pc = viewerPc || createViewerPc();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc:answer", { liveId: liveId.value, to: from, answer: pc.localDescription });
    return;
  }

  // host: receive renegotiation offer from viewer (for viewer mic)
  const pc = hostPcByViewer.get(from) || createHostPc(from);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("webrtc:answer", { liveId: liveId.value, to: from, answer: pc.localDescription });
});

socket.on("webrtc:answer", async ({ liveId: lid, from, answer }) => {
  if (String(lid) !== String(liveId.value)) return;
  if (!answer || !from) return;

  if (isHost.value) {
    const pc = hostPcByViewer.get(from);
    if (!pc) return;
    await pc.setRemoteDescription(answer);
  } else {
    // viewer usually won't get answer (host is offerer), but safe:
    if (!viewerPc) return;
    await viewerPc.setRemoteDescription(answer);
  }
});

socket.on("webrtc:ice", async ({ liveId: lid, from, candidate }) => {
  if (String(lid) !== String(liveId.value)) return;
  if (!candidate || !from) return;

  try {
    if (isHost.value) {
      const pc = hostPcByViewer.get(from);
      if (pc) await pc.addIceCandidate(candidate);
    } else {
      if (viewerPc) await viewerPc.addIceCandidate(candidate);
    }
  } catch {}
});

/* =========================
   MOUNT / UNMOUNT
========================= */
onMounted(async () => {
  await nextTick();
  await enableSoundOnce();

  // auto-start if mode=host
  if (isHost.value) {
    // do nothing automatically (keeps your control)
  } else {
    // do nothing automatically (viewer taps join)
  }
});

onBeforeUnmount(() => {
  try { socket.disconnect(); } catch {}
  closeHostAll();
  stopHostMedia();
  stopViewerMic();
  closeViewerPc();
});
</script>

<style scoped>
.wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
.top { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.centerTitle .titleRow { display:flex; align-items:center; gap:10px; }
.title { font-weight:900; font-size:22px; }
.metaRow { margin-top:4px; opacity:.85; font-size:13px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.dot { opacity:.5; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.rightBtns { display:flex; gap:10px; }

.grid { display:grid; grid-template-columns: 2fr 1fr; gap:12px; align-items:start; }
@media (max-width: 1050px){ .grid { grid-template-columns:1fr; } }

.card { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:18px; padding:14px; backdrop-filter: blur(10px); }

.controls { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
.chips { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:12px; }

.pill { font-weight:800; font-size:12px; padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
.pill.ok { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.14); }
.pill.warn { border-color: rgba(255,180,60,.30); background: rgba(255,180,60,.12); }

.reqBox { border:1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.25); border-radius:14px; padding:12px; margin-bottom:12px; }
.reqTitle { font-weight:900; margin-bottom:8px; }
.reqRow { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px; border-radius:12px; background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); margin-bottom:8px; }
.reqName { display:flex; flex-direction:column; gap:2px; }
.reqSub { opacity:.75; font-size:12px; }
.reqBtns { display:flex; gap:8px; }
.mini { border:none; border-radius:999px; padding:8px 10px; cursor:pointer; color:white; font-weight:900; }
.mini.ok { background: rgba(40,200,120,.25); border:1px solid rgba(40,200,120,.35); }
.mini.no { background: rgba(255,80,80,.25); border:1px solid rgba(255,80,80,.35); }

.stage { display:grid; gap:12px; }
.hostPreview { border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); background:#000; height: 220px; position:relative; }
@media (max-width: 700px){ .hostPreview { height: 180px; } }

.mainScreen { border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); background:#000; height: min(68vh, 560px); position:relative; }
@media (max-width: 700px){ .mainScreen { height: min(55vh, 480px); } }

.label { position:absolute; top:10px; left:10px; z-index:2; font-weight:900; font-size:12px; padding:6px 10px; border-radius:999px; background: rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.14); }

.video { width:100%; height:100%; object-fit: cover; display:block; background:#000; }

.empty { position:absolute; inset:0; display:grid; place-items:center; text-align:center; padding:20px; background: radial-gradient(circle at top, rgba(0,160,255,.10), rgba(0,0,0,.55)); }
.empty .big { font-size:40px; margin-bottom:10px; }
.empty .txt { opacity:.9; font-weight:800; }

.chatCard { display:flex; flex-direction:column; gap:10px; height: min(72vh, 640px); }
.chatTitle { font-weight:900; }
.chatList { flex:1; overflow:auto; padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.20); }
.msg { padding:10px; border-radius:12px; background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); margin-bottom:8px; }
.msgTop { display:flex; justify-content:space-between; align-items:center; gap:10px; opacity:.9; font-size:12px; }
.time { opacity:.7; }
.msgBody { margin-top:4px; font-weight:700; }

.chatInput { display:flex; gap:10px; }
.input { flex:1; padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.25); color:white; outline:none; }

.btn, .chip { border:none; border-radius:999px; padding:10px 14px; cursor:pointer; background: rgba(255,255,255,0.12); color:white; }
.btn.primary { background: linear-gradient(45deg,#00c6ff,#0072ff); }
.btn.danger { background: rgba(255,80,80,.20); border:1px solid rgba(255,80,80,.35); }
.btn.ghost { background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.12); }

.badge { font-size:12px; padding:5px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
.badge.host { border-color: rgba(180,120,255,.35); background: rgba(180,120,255,.12); }
.badge.watch { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.ok { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.14); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }
</style>