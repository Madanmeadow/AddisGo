<template>
  <Layout>
    <div class="wrap">
      <!-- TOP -->
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="centerTitle">
          <div class="titleRow">
            <div class="title">AddisGo Live</div>

            <span class="badge" :class="isHost ? 'host' : 'watch'">
              {{ isHost ? "HOST" : "WATCH" }}
            </span>

            <span class="badge live" v-if="socketOk">SOCKET OK</span>
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
          <button class="chip" v-if="isHost" @click="toggleRequests">
            {{ showRequests ? "Hide Requests" : `Requests (${micRequests.length})` }}
          </button>
          <button class="chip" @click="toggleChat">
            {{ chatOpen ? "Hide Chat" : "Show Chat" }}
          </button>
        </div>
      </header>

      <section class="grid">
        <!-- VIDEO -->
        <div class="card videoCard">
          <div class="controls">
            <!-- HOST -->
            <template v-if="isHost">
              <button class="btn primary" @click="startLive" :disabled="busy || status==='hosting'">
                Start Live
              </button>
              <button class="btn danger" @click="endLive" :disabled="busy || status!=='hosting'">
                End Live
              </button>

              <button class="btn ghost" @click="toggleMic" :disabled="!localStream">
                {{ micOn ? "Mute Mic" : "Unmute Mic" }}
              </button>
              <button class="btn ghost" @click="toggleCam" :disabled="!localStream">
                {{ camOn ? "Cam Off" : "Cam On" }}
              </button>
            </template>

            <!-- WATCH -->
            <template v-else>
              <button class="btn primary" @click="joinLive" :disabled="busy || joined">
                Join
              </button>
              <button class="btn ghost" @click="leaveLive" :disabled="busy || !joined">
                Leave
              </button>

              <button class="btn ghost" @click="requestMic" :disabled="busy || requested || canSpeak">
                🎤 Request Mic
              </button>

              <button class="btn primary" @click="startViewerMic" :disabled="busy || !canSpeak || viewerMicOn">
                Start Mic
              </button>
              <button class="btn danger" @click="stopViewerMic" :disabled="busy || !viewerMicOn">
                Stop Mic
              </button>
            </template>

            <button class="btn ghost" @click="reconnect" :disabled="busy">Reconnect</button>
            <button class="btn ghost" @click="copyShare">Share</button>
          </div>

          <div class="subRow">
            <span class="pill" :class="iceMode.includes('TURN') ? 'good' : 'mid'">
              {{ iceMode }}
            </span>
            <span class="pill" :class="canSpeak ? 'good' : 'mid'" v-if="!isHost">
              Mic: {{ canSpeak ? "Approved" : (requested ? "Requested" : "Not approved") }}
            </span>
            <span class="warn" v-if="iceMode.includes('STUN only')">
              ⚠️ TURN not available; some networks may fail.
            </span>
          </div>

          <div class="videoBox">
            <video v-if="isHost" ref="hostVideo" class="video" autoplay muted playsinline />
            <video v-else ref="watchVideo" class="video" autoplay playsinline />
            <div class="tag">{{ isHost ? "HOST" : "LIVE" }}</div>
          </div>

          <div class="toast" v-if="toast">{{ toast }}</div>
        </div>

        <!-- HOST: MIC REQUESTS -->
        <aside v-if="isHost && showRequests" class="card sideCard">
          <div class="sideTitle">Mic Requests</div>

          <div v-if="micRequests.length===0" class="empty">No requests right now.</div>

          <div v-for="r in micRequests" :key="String(r.fromUserId)" class="reqCard">
            <div class="reqTop">
              <div class="reqName">👤 {{ r.fromName || ('User' + r.fromUserId) }}</div>
              <div class="reqMeta mono">#{{ r.fromUserId }}</div>
            </div>

            <div class="reqBtns">
              <button class="btn small primary" @click="approveMic(r.fromUserId)" :disabled="busy">
                Approve
              </button>
              <button class="btn small danger" @click="denyMic(r.fromUserId)" :disabled="busy">
                Deny
              </button>
            </div>
          </div>

          <div class="divider"></div>

          <div class="sideTitle">Speakers</div>
          <div class="chips">
            <span class="chipTiny" v-for="id in speakerUserIds" :key="id">🎙️ {{ id }}</span>
          </div>
        </aside>

        <!-- CHAT -->
        <aside v-if="chatOpen" class="card chatCard">
          <div class="sideTitle">Live Chat</div>

          <div class="chatList" ref="chatListEl">
            <div v-for="(m,i) in chat" :key="i" class="chatItem">
              <div class="chatName">{{ m?.from?.username || "Anon" }}</div>
              <div class="chatText">{{ m.message }}</div>
              <div class="chatTime">{{ formatTime(m.at) }}</div>
            </div>
          </div>

          <div class="chatBox">
            <input class="input" v-model="chatText" placeholder="Say hi 👋" @keydown.enter="sendChat" />
            <button class="btn primary" @click="sendChat" :disabled="!chatText.trim()">Send</button>
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

const liveId = ref(String(route.query.liveId || route.query.id || "live-1"));
const isHost = computed(() => String(route.query.mode || "watch") === "host");

const status = ref(isHost.value ? "idle" : "watching");
const ended = ref(false);
const busy = ref(false);

const socketOk = ref(false);
const viewerCount = ref(0);

const hostVideo = ref(null);
const watchVideo = ref(null);

let hostSocketId = null;
let pc = null;
let localStream = null;

const micOn = ref(true);
const camOn = ref(true);

const joined = ref(false);
const requested = ref(false);
const canSpeak = ref(false);
const viewerMicOn = ref(false);

const showRequests = ref(true);
const micRequests = ref([]);
const speakerUserIds = ref([]);

const chatOpen = ref(true);
const chat = ref([]);
const chatText = ref("");
const chatListEl = ref(null);

const toast = ref("");
let toastTimer = null;
function setToast(t, ms = 2500) {
  toast.value = t;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), ms);
}

function toggleRequests() { showRequests.value = !showRequests.value; }
function toggleChat() { chatOpen.value = !chatOpen.value; }

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

async function playPing() {
  try {
    const a = new Audio();
    // tiny silent wav (no 416, no mp3 fetch)
    a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    await a.play().catch(() => {});
    a.pause();
  } catch {}
}

/* ICE */
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s =>
    String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:")
  );
  return hasTurn ? "STUN+TURN" : "STUN only";
});
async function loadIceServers() {
  try {
    const r = await fetch(`${apiUrl}/api/turn`);
    const data = await r.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
    }
  } catch {}
}

/* WebRTC */
function ensurePC() {
  if (pc) return pc;
  pc = new RTCPeerConnection({ iceServers: iceServers.value });

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.emit("webrtc:ice", {
      liveId: liveId.value,
      to: isHost.value ? lastViewerSocketId : hostSocketId,
      candidate: e.candidate,
    });
  };

  pc.ontrack = (e) => {
    const stream = e.streams?.[0];
    if (!stream) return;
    if (!isHost.value && watchVideo.value) watchVideo.value.srcObject = stream;
    // host receiving viewer mic audio: ok (no UI needed)
  };

  return pc;
}

let lastViewerSocketId = null;

function addTracks(stream) {
  const _pc = ensurePC();
  _pc.getSenders().forEach(s => { try { _pc.removeTrack(s); } catch {} });
  for (const tr of stream.getTracks()) _pc.addTrack(tr, stream);
}

/* Host Media */
async function startHostMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { width: 1280, height: 720 },
  });
  micOn.value = true;
  camOn.value = true;
  if (hostVideo.value) hostVideo.value.srcObject = localStream;

  // host sends video+audio to viewers
  addTracks(localStream);
}

function stopLocal() {
  if (!localStream) return;
  localStream.getTracks().forEach(t => t.stop());
  localStream = null;
}

/* Buttons */
async function startLive() {
  busy.value = true;
  try {
    ended.value = false;
    await loadIceServers();
    await startHostMedia();

    socket.emit("live:create", { liveId: liveId.value });
    status.value = "hosting";
    setToast("✅ Live started");
    canSpeak.value = true; // host default speaker
  } catch (e) {
    console.error(e);
    alert("Could not start live. Check camera/mic permission.");
  } finally {
    busy.value = false;
  }
}

async function endLive() {
  busy.value = true;
  try {
    socket.emit("live:end", { liveId: liveId.value });
    status.value = "idle";
    ended.value = true;
    stopLocal();
    if (pc) { try { pc.close(); } catch {} pc = null; }
    setToast("🛑 Live ended");
  } finally {
    busy.value = false;
  }
}

async function joinLive() {
  busy.value = true;
  try {
    ended.value = false;
    await loadIceServers();
    socket.emit("live:join", { liveId: liveId.value });
    joined.value = true;
    status.value = "watching";
    setToast("👀 Joined live");
  } finally {
    busy.value = false;
  }
}

async function leaveLive() {
  busy.value = true;
  try {
    socket.emit("live:leave", { liveId: liveId.value });
    joined.value = false;
    requested.value = false;
    canSpeak.value = false;
    viewerMicOn.value = false;
    if (watchVideo.value) watchVideo.value.srcObject = null;
    if (pc) { try { pc.close(); } catch {} pc = null; }
    setToast("👋 Left live");
  } finally {
    busy.value = false;
  }
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

function requestMic() {
  if (requested.value) return;
  requested.value = true;
  socket.emit("live:mic:request", { liveId: liveId.value });
  setToast("🎤 Request sent");
}

async function startViewerMic() {
  if (!canSpeak.value) return;
  busy.value = true;
  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    viewerMicOn.value = true;

    addTracks(micStream);

    const _pc = ensurePC();
    const offer = await _pc.createOffer();
    await _pc.setLocalDescription(offer);

    socket.emit("webrtc:offer", {
      liveId: liveId.value,
      to: hostSocketId,
      offer: _pc.localDescription,
    });

    setToast("🎙️ Mic started");
  } catch (e) {
    console.error(e);
    alert("Mic failed. Check permission.");
  } finally {
    busy.value = false;
  }
}

function stopViewerMic() {
  viewerMicOn.value = false;
  try { if (pc) pc.close(); } catch {}
  pc = null;
  setToast("🛑 Mic stopped");
}

function approveMic(userId) {
  socket.emit("live:mic:approve", { liveId: liveId.value, userId: String(userId) });
  micRequests.value = micRequests.value.filter(r => String(r.fromUserId) !== String(userId));
  setToast("✅ Approved mic");
}

function denyMic(userId) {
  socket.emit("live:mic:deny", { liveId: liveId.value, userId: String(userId), reason: "Host denied" });
  micRequests.value = micRequests.value.filter(r => String(r.fromUserId) !== String(userId));
  setToast("❌ Denied mic");
}

async function reconnect() {
  busy.value = true;
  try {
    if (pc) { try { pc.close(); } catch {} pc = null; }
    if (!isHost.value) {
      joined.value = false;
      await joinLive();
    } else {
      if (status.value === "hosting") socket.emit("live:create", { liveId: liveId.value });
    }
    setToast("🔁 Reconnected");
  } finally {
    busy.value = false;
  }
}

async function copyShare() {
  const url = `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}`;
  try {
    await navigator.clipboard.writeText(url);
    setToast("📋 Link copied");
  } catch {
    setToast(url, 4000);
  }
}

/* Chat */
function sendChat() {
  const text = chatText.value.trim();
  if (!text) return;
  socket.emit("live:chat", { liveId: liveId.value, message: text });
  chatText.value = "";
}

/* SOCKET */
const socket = io(apiUrl, {
  transports: ["websocket", "polling"],
  auth: token ? { token } : undefined,
});

socket.on("connect", () => {
  socketOk.value = true;
  if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });
});

socket.on("disconnect", () => { socketOk.value = false; });

socket.on("live:host", ({ hostSocketId: hid }) => { hostSocketId = hid || null; });

socket.on("live:presence", ({ viewerCount: vc }) => { viewerCount.value = Number(vc || 0); });

socket.on("live:ended", () => {
  ended.value = true;
  setToast("🛑 Live ended by host", 3500);
  if (watchVideo.value) watchVideo.value.srcObject = null;
  joined.value = false;
  requested.value = false;
  canSpeak.value = false;
  viewerMicOn.value = false;
  if (pc) { try { pc.close(); } catch {} pc = null; }
});

socket.on("live:chat", (msg) => {
  chat.value.push(msg);
  nextTick(() => {
    const el = chatListEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
});

/* ✅ THIS FIXES YOUR POPUP ISSUE */
socket.on("live:mic:requested", async (payload) => {
  if (!isHost.value) return;
  await playPing();
  setToast(`🎤 Mic request from ${payload?.fromName || "User"}`, 3500);

  const uid = String(payload?.fromUserId || "");
  if (!uid) return;

  if (!micRequests.value.some(r => String(r.fromUserId) === uid)) {
    micRequests.value.unshift(payload);
  }
});

socket.on("live:mic:speakers", ({ speakerUserIds: ids }) => {
  if (Array.isArray(ids)) speakerUserIds.value = ids.map(String);
});

socket.on("live:mic:status", ({ canSpeak: cs }) => { canSpeak.value = !!cs; });

socket.on("live:mic:approved", async () => {
  canSpeak.value = true;
  requested.value = false;
  await playPing();
  setToast("✅ Host approved your mic");
});

socket.on("live:mic:denied", async ({ reason }) => {
  canSpeak.value = false;
  requested.value = false;
  await playPing();
  setToast(`❌ Mic denied: ${reason || "denied"}`, 3500);
});

/* WebRTC relay */
socket.on("webrtc:offer", async ({ liveId: lid, from, offer }) => {
  if (String(lid) !== String(liveId.value)) return;
  const _pc = ensurePC();
  if (isHost.value) lastViewerSocketId = from;

  try {
    await _pc.setRemoteDescription(offer);
    const answer = await _pc.createAnswer();
    await _pc.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      liveId: liveId.value,
      to: from,
      answer: _pc.localDescription,
    });
  } catch (e) {
    console.error(e);
  }
});

socket.on("webrtc:answer", async ({ liveId: lid, answer }) => {
  if (String(lid) !== String(liveId.value)) return;
  try { await ensurePC().setRemoteDescription(answer); } catch {}
});

socket.on("webrtc:ice", async ({ liveId: lid, candidate }) => {
  if (String(lid) !== String(liveId.value)) return;
  try { await ensurePC().addIceCandidate(candidate); } catch {}
});

onMounted(async () => {
  if (!isHost.value) await joinLive();
});

onBeforeUnmount(() => {
  try { if (!isHost.value) socket.emit("live:leave", { liveId: liveId.value }); } catch {}
  try { socket.disconnect(); } catch {}
  try { if (pc) pc.close(); } catch {}
  stopLocal();
});
</script>

<style scoped>
.wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }

.top { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.centerTitle { flex: 1; min-width: 260px; }
.titleRow { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.title { font-weight:900; font-size:22px; }
.metaRow { margin-top:4px; opacity:.85; font-size:13px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.dot { opacity:.5; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }

.rightBtns { display:flex; gap:10px; }

.grid { display:grid; grid-template-columns: 2fr 1fr; gap:12px; align-items:start; }
@media (max-width: 1050px) { .grid { grid-template-columns: 1fr; } }

.card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
}

.controls { display:flex; gap:10px; flex-wrap:wrap; }
.subRow { margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

.videoBox {
  margin-top: 12px;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.12);
  background: #000;
  min-height: 420px;
}
.video { width:100%; height:100%; display:block; object-fit:cover; background:#000; }
.tag {
  position:absolute; top:10px; left:10px;
  padding: 6px 10px; border-radius:999px;
  font-weight:900; font-size:12px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.14);
}

.toast {
  margin-top: 10px;
  font-weight: 900;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);
}

.sideCard, .chatCard { display:flex; flex-direction:column; gap:10px; }
.sideTitle { font-weight:900; }
.empty { opacity:.75; font-size:13px; }

.reqCard {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 10px;
  background: rgba(0,0,0,0.18);
}
.reqTop { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; }
.reqName { font-weight:900; }
.reqMeta { opacity:.8; font-size:12px; }
.reqBtns { display:flex; gap:10px; }

.chips { display:flex; gap:8px; flex-wrap:wrap; }
.chipTiny {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 900;
}

.chatList {
  height: 340px;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  padding: 10px;
  background: rgba(0,0,0,0.14);
}
.chatItem { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.chatName { font-weight:900; font-size:13px; }
.chatText { opacity:.92; }
.chatTime { opacity:.65; font-size:11px; margin-top:2px; }

.chatBox { display:flex; gap:10px; }
.input {
  flex:1;
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
}

.btn, .chip {
  border:none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor:pointer;
  background: rgba(255,255,255,0.12);
  color:white;
}
.btn.primary { background: linear-gradient(45deg,#00c6ff,#0072ff); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }
.btn.danger { background: rgba(255,80,80,.20); border: 1px solid rgba(255,80,80,.35); }
.btn.small { padding: 8px 12px; font-size: 12px; }

.badge {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
}
.badge.host { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.12); }
.badge.watch { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.live  { border-color: rgba(255,180,60,.25); background: rgba(255,180,60,.10); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }

.pill {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
  font-weight: 900;
}
.pill.good { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.12); }
.pill.mid  { border-color: rgba(255,180,60,.25); background: rgba(255,180,60,.10); }

.warn { opacity:.85; font-size: 12px; }

.divider { height:1px; background: rgba(255,255,255,.10); margin: 8px 0; }
</style>