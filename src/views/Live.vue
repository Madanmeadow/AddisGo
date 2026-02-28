<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="centerTitle">
          <div class="titleRow">
            <div class="title">Live</div>
            <span class="badge" :class="isHost ? 'host' : 'watch'">
              {{ isHost ? "HOST" : "WATCH" }}
            </span>
            <span class="badge live" v-if="isLive">🔴 LIVE</span>
            <span class="badge ended" v-if="ended">ENDED</span>
          </div>

          <div class="metaRow">
            <span>Live ID: <b class="mono">{{ liveId || "—" }}</b></span>
            <span class="dot">•</span>
            <span>Viewers: <b class="mono">{{ viewerCount }}</b></span>
            <span class="dot">•</span>
            <span>Status: <b>{{ statusText }}</b></span>
          </div>
        </div>

        <div class="rightBtns">
          <button class="chip" @click="panelOpen = !panelOpen">
            {{ panelOpen ? "Hide Chat" : "Show Chat" }}
          </button>
          <button class="chip primary" :disabled="!liveId" @click="copyShare">
            Share
          </button>
        </div>
      </header>

      <section class="grid">
        <!-- VIDEO CARD -->
        <div class="card videoCard">
          <div class="videoTop">
            <div class="small muted">
              ICE: <b>{{ iceMode }}</b>
              <span class="dot">•</span>
              Socket: <b>{{ socketState }}</b>
            </div>

            <div class="small muted" v-if="isHost">
              Connections: <b>{{ peerCount }}</b>
            </div>
          </div>

          <div class="videoWrap">
            <video
              ref="videoEl"
              class="video"
              autoplay
              playsinline
              :muted="isHost"
              controls
            ></video>

            <div class="overlay" v-if="overlayText">
              <div class="overlayTitle">{{ overlayText }}</div>
              <div class="overlaySub">{{ overlaySub }}</div>

              <!-- iOS: gesture is needed for audio sometimes -->
              <button v-if="needsTapToPlay" class="btn primary" style="margin-top:12px" @click="userTapPlay">
                Tap to start audio/video
              </button>
            </div>
          </div>

          <div class="controls">
            <template v-if="isHost">
              <button class="btn primary" @click="startHost" :disabled="isLive || busy">
                {{ busy && !isLive ? "Starting..." : "Start Live" }}
              </button>
              <button class="btn danger" @click="endHost" :disabled="!isLive || busy">
                End Live
              </button>
              <button class="btn ghost" @click="toggleMic" :disabled="!localStream">
                {{ micOn ? "Mute Mic" : "Unmute Mic" }}
              </button>
              <button class="btn ghost" @click="toggleCam" :disabled="!localStream">
                {{ camOn ? "Cam Off" : "Cam On" }}
              </button>
            </template>

            <template v-else>
              <button class="btn primary" @click="joinViewer" :disabled="joined || busy || !liveId">
                {{ busy && !joined ? "Joining..." : "Join" }}
              </button>
              <button class="btn ghost" @click="leaveViewer" :disabled="!joined || busy">
                Leave
              </button>

              <button class="btn ghost" @click="requestToSpeak" :disabled="!joined || ended || requestedSpeak || canSpeak">
                🎤 Request Mic
              </button>

              <button class="btn ghost" @click="startSpeaking" :disabled="!joined || ended || !canSpeak || speaking">
                🎙️ Start Mic
              </button>

              <button class="btn danger" @click="stopSpeaking" :disabled="!speaking">
                🛑 Stop Mic
              </button>
            </template>

            <div class="hint">
              {{ hintText }}
            </div>
          </div>
        </div>

        <!-- CHAT CARD -->
        <aside v-if="panelOpen" class="card chatCard">
          <div class="chatHead">
            <div>
              <div class="chatTitle">Live Chat</div>
              <div class="small muted">Realtime</div>
            </div>
          </div>

          <div class="chatBody" ref="chatBox">
            <div v-if="chat.length === 0" class="empty">
              Say hi 👋
            </div>

            <div v-for="(m, i) in chat" :key="i" class="msg">
              <div class="bubble">
                <div class="msgMeta">
                  <b>{{ m.from?.username || "Anon" }}</b>
                  <span class="small muted">{{ fmtTime(m.at) }}</span>
                </div>
                <div class="msgText">{{ m.message }}</div>
              </div>
            </div>
          </div>

          <div class="chatInput">
            <input
              class="input"
              v-model="chatText"
              placeholder="Message…"
              @keydown.enter="sendChat"
              :disabled="!liveId"
            />
            <button class="btn primary" @click="sendChat" :disabled="!chatText.trim() || !liveId">
              Send
            </button>
          </div>
        </aside>

        <!-- INFO CARD -->
        <div class="card infoCard">
          <div class="infoTitle">How it works</div>
          <ul class="list">
            <li><b>Host</b> starts live → viewers join → host sends stream to each viewer.</li>
            <li><b>TURN</b> makes it work on cellular & strict Wi-Fi networks.</li>
            <li>For big audiences later: upgrade to <b>SFU</b> (LiveKit/mediasoup).</li>
          </ul>

          <!-- HOST: requests to speak -->
          <div v-if="isHost" class="divider"></div>
          <div v-if="isHost" class="infoTitle">Requests to speak</div>

          <div v-if="isHost && speakRequests.length === 0" class="small muted">
            No requests
          </div>

          <div
            v-if="isHost"
            v-for="r in speakRequests"
            :key="r.socketId"
            class="reqRow"
          >
            <div class="reqLeft">
              <b>{{ r.user?.username || "Viewer" }}</b>
              <span class="mono small">({{ (r.socketId || '').slice(0,6) }})</span>
            </div>

            <div class="reqBtns">
              <button class="btn primary" @click="allowSpeaker(r.socketId)">Allow</button>
              <button class="btn danger" @click="removeSpeaker(r.socketId)">Remove</button>
            </div>
          </div>

          <div v-if="isHost" class="small muted" style="margin-top:10px;">
            Speakers: <b class="mono">{{ speakers.length }}</b>
          </div>

          <div class="divider"></div>

          <div class="shareBlock">
            <div class="small muted">Share link</div>
            <div class="mono small">{{ shareUrl || "—" }}</div>
            <button class="btn ghost w100" :disabled="!liveId" @click="copyShare">Copy</button>
          </div>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const route = useRoute();
const apiUrl = import.meta.env.VITE_API_URL;

// identity
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

// query params
const mode = ref((route.query.mode || "watch").toString()); // host | watch
const liveId = ref((route.query.liveId || "").toString());

const isHost = computed(() => mode.value === "host");

// UI state
const panelOpen = ref(true);
const busy = ref(false);
const isLive = ref(false);
const joined = ref(false);
const ended = ref(false);

const viewerCount = ref(0);
const socketState = ref("connecting");

// chat
const chat = ref([]);
const chatText = ref("");
const chatBox = ref(null);

// video
const videoEl = ref(null);
let localStream = null;

// toggles
const micOn = ref(true);
const camOn = ref(true);

// iOS autoplay helper
const needsTapToPlay = ref(false);

// ===== SPEAK MODE (viewer mic) =====
const canSpeak = ref(false);
const speaking = ref(false);
const requestedSpeak = ref(false);
let viewerMicStream = null;

// Host: requests list + speakers list
const speakRequests = ref([]); // [{ socketId, user, at }]
const speakers = ref([]);      // [socketId...]

// ICE servers loaded from backend (TURN)
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s => String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:"));
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// Host fan-out peers
const peers = new Map(); // viewerSocketId -> RTCPeerConnection
const peerCount = computed(() => peers.size);

// Viewer peer
let pcViewer = null;

// socket
const socket = io(apiUrl, { transports: ["websocket", "polling"] });

// derived
const shareUrl = computed(() =>
  liveId.value ? `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}` : ""
);

const statusText = computed(() => {
  if (ended.value) return "ended";
  if (isHost.value) return isLive.value ? "broadcasting" : "ready";
  return joined.value ? (speaking.value ? "speaking" : "watching") : "not joined";
});

const overlayText = computed(() => {
  if (ended.value) return "Live ended";
  if (isHost.value && !isLive.value) return "Ready to go live";
  if (!isHost.value && !joined.value) return "Tap Join to watch";
  return "";
});
const overlaySub = computed(() => {
  if (ended.value) return "The host ended the stream.";
  if (isHost.value && !isLive.value) return "Start your camera and broadcast to viewers.";
  if (!isHost.value && !joined.value) return "If the host is live, you’ll connect instantly.";
  return "";
});

const hintText = computed(() => {
  if (iceMode.value === "STUN only") return "⚠️ TURN not configured (some networks may fail)";
  return "✅ TURN enabled (reliable on mobile networks)";
});

// helpers
function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function scrollChat() {
  nextTick(() => {
    if (!chatBox.value) return;
    chatBox.value.scrollTop = chatBox.value.scrollHeight;
  });
}

async function userTapPlay() {
  needsTapToPlay.value = false;
  try { await videoEl.value?.play?.(); } catch {}
}

// Clipboard
async function copyShare() {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = shareUrl.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// Load ICE from backend  ✅ /turn (not /api/turn)
async function loadIceServers() {
  try {
    const r = await fetch(`${apiUrl}/turn`);
    const data = await r.json();
    if ((data?.ok || data?.iceServers) && Array.isArray(data.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
    }
  } catch {
    // keep STUN fallback
  }
}

// camera (host)
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true,
  });
  micOn.value = true;
  camOn.value = true;
  if (videoEl.value) {
    videoEl.value.srcObject = localStream;
    try { await videoEl.value.play(); } catch { needsTapToPlay.value = true; }
  }
}
function stopCamera() {
  if (!localStream) return;
  localStream.getTracks().forEach(t => t.stop());
  localStream = null;
}
function addLocalTracks(pc) {
  if (!localStream) return;
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
}
function toggleMic() {
  if (!localStream) return;
  const a = localStream.getAudioTracks()[0];
  if (!a) return;
  a.enabled = !a.enabled;
  micOn.value = a.enabled;
}
function toggleCam() {
  if (!localStream) return;
  const v = localStream.getVideoTracks()[0];
  if (!v) return;
  v.enabled = !v.enabled;
  camOn.value = v.enabled;
}

// viewer reset
function resetViewerPeer() {
  if (pcViewer) pcViewer.close();
  pcViewer = null;
  if (videoEl.value) videoEl.value.srcObject = null;
}

// host peers
function closePeer(viewerSocketId) {
  const pc = peers.get(viewerSocketId);
  if (pc) {
    try { pc.close(); } catch {}
    peers.delete(viewerSocketId);
  }
}

// Create host->viewer peer
// Create host->viewer peer (LIVE VIDEO)
async function createPeerForViewer(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: viewerSocketId,
        candidate: e.candidate,
        kind: "live", // ✅ add this
      });
    }
  };

  addLocalTracks(pc);
  peers.set(viewerSocketId, pc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", {
    liveId: liveId.value,
    to: viewerSocketId,
    offer: pc.localDescription,
    kind: "live", // ✅ add this
  });
}
// Host actions
async function startHost() {
  if (busy.value || isLive.value) return;

  if (!liveId.value) {
    liveId.value = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  }

  busy.value = true;
  ended.value = false;

  try {
    await startCamera();
    socket.emit("live:create", { liveId: liveId.value });
    isLive.value = true;
  } catch {
    alert("Camera/Mic permission denied.");
  } finally {
    busy.value = false;
  }
}

function endHost() {
  if (busy.value || !isLive.value) return;
  busy.value = true;

  try {
    socket.emit("live:end", { liveId: liveId.value });
    for (const [id] of peers) closePeer(id);
    stopCamera();
    isLive.value = false;
    ended.value = true;
  } finally {
    busy.value = false;
  }
}

// Viewer actions
function joinViewer() {
  if (busy.value || joined.value || !liveId.value) return;
  busy.value = true;
  ended.value = false;

  socket.emit("live:join", { liveId: liveId.value });
  joined.value = true;

  busy.value = false;
}

function leaveViewer() {
  if (busy.value || !joined.value) return;
  busy.value = true;

  stopSpeaking(); // ensure mic stopped
  socket.emit("live:leave", { liveId: liveId.value });
  joined.value = false;
  resetViewerPeer();

  busy.value = false;
}

// Chat
function sendChat() {
  const msg = chatText.value.trim();
  if (!msg || !liveId.value) return;
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

/* ===================== SPEAK MODE (viewer) ===================== */
function requestToSpeak() {
  if (!liveId.value || !joined.value) return;
  requestedSpeak.value = true;
  socket.emit("live:speak:request", { liveId: liveId.value });
}

async function startSpeaking() {
  if (!canSpeak.value || speaking.value) return;

  try {
    viewerMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    speaking.value = true;

    // attach mic to existing pcViewer if present
    if (pcViewer) {
      const track = viewerMicStream.getAudioTracks()[0];
      if (track) {
        const sender = pcViewer.getSenders().find((s) => s.track?.kind === "audio");
        if (sender) await sender.replaceTrack(track);
        else pcViewer.addTrack(track, viewerMicStream);
      }
    }
  } catch {
    alert("Mic permission denied.");
  }
}

function stopSpeaking() {
  speaking.value = false;
  canSpeak.value = false;
  requestedSpeak.value = false;

  try {
    if (viewerMicStream) {
      viewerMicStream.getTracks().forEach((t) => t.stop());
      viewerMicStream = null;
    }
  } catch {}

  if (liveId.value) socket.emit("live:speak:stop", { liveId: liveId.value });
}

/* ===================== SPEAK MODE (host) ===================== */
function allowSpeaker(socketId) {
  if (!liveId.value || !socketId) return;
  socket.emit("live:speak:grant", { liveId: liveId.value, viewerSocketId: socketId });
}
function removeSpeaker(socketId) {
  if (!liveId.value || !socketId) return;
  socket.emit("live:speak:revoke", { liveId: liveId.value, viewerSocketId: socketId });
}

/* ===================== SOCKET EVENTS ===================== */
socket.on("connect", () => {
  socketState.value = "connected";
  if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });
});

socket.on("disconnect", () => {
  socketState.value = "disconnected";
});

socket.on("live:presence", ({ liveId: id, viewerCount: c }) => {
  if (id === liveId.value) viewerCount.value = c;
});

socket.on("live:chat", (m) => {
  if (m.liveId !== liveId.value) return;
  chat.value.push(m);
  scrollChat();
});

socket.on("live:ended", ({ liveId: id }) => {
  if (id !== liveId.value) return;
  ended.value = true;
  isLive.value = false;
  joined.value = false;

  stopSpeaking();
  resetViewerPeer();
  for (const [vid] of peers) closePeer(vid);
  stopCamera();
});

// Host: viewer joined
socket.on("live:viewer-joined", async ({ liveId: id, viewerSocketId }) => {
  if (!isHost.value || !isLive.value) return;
  if (id !== liveId.value) return;
  try {
    await createPeerForViewer(viewerSocketId);
  } catch {}
});

// Host: viewer left
socket.on("live:viewer-left", ({ liveId: id, viewerSocketId }) => {
  if (!isHost.value) return;
  if (id !== liveId.value) return;
  closePeer(viewerSocketId);
});

/* ===== speak: host updates ===== */
socket.on("live:speak:requests", ({ liveId: id, requests = [] }) => {
  if (!isHost.value || id !== liveId.value) return;
  speakRequests.value = Array.isArray(requests) ? requests : [];
});
socket.on("live:speakers", ({ liveId: id, speakers: list = [] }) => {
  if (id !== liveId.value) return;
  speakers.value = Array.isArray(list) ? list : [];
});

/* ===== speak: viewer permission ===== */
socket.on("live:speak:granted", ({ liveId: id } = {}) => {
  if (id !== liveId.value) return;
  canSpeak.value = true;
  // user must still tap Start Mic on iPhone
});
socket.on("live:speak:revoked", ({ liveId: id } = {}) => {
  if (id !== liveId.value) return;
  stopSpeaking();
});

// Viewer: offer from host
socket.on("webrtc:offer", async ({ liveId: id, from, offer }) => {
  if (isHost.value || !joined.value) return;
  if (id !== liveId.value) return;

  try {
    resetViewerPeer();
    pcViewer = new RTCPeerConnection({ iceServers: iceServers.value });

    pcViewer.ontrack = (e) => {
      if (videoEl.value) {
        videoEl.value.srcObject = e.streams[0];
        try { videoEl.value.play(); } catch { needsTapToPlay.value = true; }
      }
    };

    pcViewer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc:ice", {
          liveId: liveId.value,
          to: from,
          candidate: e.candidate,
        });
      }
    };

    // ✅ if host granted speak AND mic already started, attach track BEFORE answer
    if (canSpeak.value && viewerMicStream) {
      const track = viewerMicStream.getAudioTracks()[0];
      if (track) pcViewer.addTrack(track, viewerMicStream);
    }

    await pcViewer.setRemoteDescription(offer);
    const answer = await pcViewer.createAnswer();
    await pcViewer.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      liveId: liveId.value,
      to: from,
      answer: pcViewer.localDescription,
    });
  } catch {}
});

// Host: answer from viewer
socket.on("webrtc:answer", async ({ liveId: id, from, answer }) => {
  if (!isHost.value) return;
  if (id !== liveId.value) return;
  const pc = peers.get(from);
  if (!pc) return;
  try {
    await pc.setRemoteDescription(answer);
  } catch {}
});

// ICE (both)
socket.on("webrtc:ice", async ({ liveId: id, from, candidate }) => {
  if (id !== liveId.value) return;
  try {
    if (isHost.value) {
      const pc = peers.get(from);
      if (pc) await pc.addIceCandidate(candidate);
    } else if (pcViewer) {
      await pcViewer.addIceCandidate(candidate);
    }
  } catch {}
});

// MOUNT
onMounted(async () => {
  await loadIceServers();

  // auto-join if watch mode with id
  if (!isHost.value && liveId.value) joinViewer();
});

// UNMOUNT
onBeforeUnmount(() => {
  try {
    if (isHost.value) endHost();
    else leaveViewer();
  } catch {}
  try { socket.disconnect(); } catch {}
});
</script>

<style scoped>
.wrap {
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.centerTitle .titleRow {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title {
  font-weight: 900;
  font-size: 22px;
}
.metaRow {
  margin-top: 4px;
  opacity: 0.85;
  font-size: 13px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.dot { opacity: 0.5; }

.rightBtns { display: flex; gap: 10px; }

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  align-items: start;
}
@media (max-width: 1050px) {
  .grid { grid-template-columns: 1fr; }
}

.card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
}

.videoCard { padding: 14px; }
.videoTop {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.small { font-size: 12px; }
.muted { opacity: 0.8; }

.videoWrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
}
.video {
  width: 100%;
  max-height: 72vh;
  background: #000;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
  background: radial-gradient(circle at top, rgba(255,255,255,.08), rgba(0,0,0,.70));
}
.overlayTitle { font-size: 20px; font-weight: 900; }
.overlaySub { margin-top: 6px; opacity: 0.85; }

.controls {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.hint { opacity: .75; font-size: 12px; }

.chatCard { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.chatHead { padding: 14px; border-bottom: 1px solid rgba(255,255,255,.10); }
.chatTitle { font-weight: 900; font-size: 16px; }

.chatBody {
  padding: 12px;
  max-height: 60vh;
  overflow: auto;
}
.empty {
  opacity: .75;
  padding: 14px;
  border-radius: 14px;
  background: rgba(0,0,0,.25);
  border: 1px dashed rgba(255,255,255,.14);
}
.msg { margin-bottom: 10px; }
.bubble {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}
.msgMeta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.msgText { margin-top: 6px; line-height: 1.4; }

.chatInput {
  padding: 12px;
  display: flex;
  gap: 10px;
  border-top: 1px solid rgba(255,255,255,.10);
}

.input {
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}

.infoCard { display: flex; flex-direction: column; gap: 10px; }
.infoTitle { font-weight: 900; }
.list { margin: 0; padding-left: 18px; opacity: .9; }
.divider { height: 1px; background: rgba(255,255,255,.10); margin: 8px 0; }
.shareBlock { display: grid; gap: 8px; }

.reqRow{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  align-items:center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.10);
}
.reqBtns{ display:flex; gap: 10px; flex-wrap: wrap; }
.reqLeft{ display:flex; gap: 10px; align-items:center; flex-wrap: wrap; }

.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.btn.primary, .chip.primary { background: linear-gradient(45deg,#ff416c,#ff4b2b); }
.btn.danger { background: rgba(255,80,80,.20); border: 1px solid rgba(255,80,80,.35); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }
.w100 { width: 100%; }

.badge {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
}
.badge.host { border-color: rgba(255,80,120,.35); background: rgba(255,80,120,.15); }
.badge.watch { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.live { border-color: rgba(255,0,0,.25); background: rgba(255,0,0,.12); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }
</style>