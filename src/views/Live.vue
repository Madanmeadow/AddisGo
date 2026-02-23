<template>
  <Layout>
    <div class="livePage">
      <!-- Top Bar -->
      <header class="topbar">
        <button class="chip" @click="goBack">← Dashboard</button>

        <div class="title">
          <div class="h1">Live</div>
          <div class="sub">
            Mode:
            <span class="pill" :class="mode">{{ modeLabel }}</span>
            <span class="dotSep">•</span>
            Live ID:
            <span class="mono">{{ liveId || "—" }}</span>
            <span class="dotSep">•</span>
            Viewers:
            <span class="mono">{{ viewerCount }}</span>
          </div>
        </div>

        <div class="actions">
          <button v-if="isHost" class="chip primary" @click="copyShareLink">
            Share Link
          </button>
          <button class="chip" @click="togglePanel">
            {{ panelOpen ? "Hide Chat" : "Show Chat" }}
          </button>
        </div>
      </header>

      <!-- Main Layout -->
      <section class="grid">
        <!-- Video Card -->
        <div class="card videoCard">
          <div class="videoHeader">
            <div class="leftInfo">
              <div class="liveBadge" v-if="isLive">🔴 LIVE</div>
              <div class="muted" v-else>Ready</div>
            </div>

            <div class="rightInfo">
              <div class="muted">
                {{ ended ? "Stream ended" : isHost ? "Broadcasting" : joined ? "Connected" : "Not joined" }}
              </div>
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

            <div class="overlay" v-if="!isLive && isHost">
              <div class="overlayTitle">Ready to Go Live</div>
              <div class="overlaySub">Start your camera and broadcast to viewers.</div>
            </div>

            <div class="overlay" v-if="!joined && !isHost && !ended">
              <div class="overlayTitle">Join Live</div>
              <div class="overlaySub">Tap “Join” to start watching.</div>
            </div>

            <div class="overlay danger" v-if="ended">
              <div class="overlayTitle">Live ended</div>
              <div class="overlaySub">The host ended the stream.</div>
            </div>
          </div>

          <!-- Controls -->
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
                {{ camOn ? "Turn Off Cam" : "Turn On Cam" }}
              </button>
            </template>

            <template v-else>
              <button class="btn primary" @click="joinViewer" :disabled="joined || busy || !liveId">
                {{ busy && !joined ? "Joining..." : "Join" }}
              </button>
              <button class="btn ghost" @click="leaveViewer" :disabled="!joined || busy">
                Leave
              </button>
            </template>

            <div class="hint">
              <span v-if="!turnConfigured">⚠️ TURN not configured (some networks may fail)</span>
              <span v-else>✅ TURN configured</span>
            </div>
          </div>
        </div>

        <!-- Chat Panel -->
        <aside v-if="panelOpen" class="card chatCard">
          <div class="chatHeader">
            <div class="h2">Live Chat</div>
            <div class="muted">Realtime messages</div>
          </div>

          <div class="chatBody" ref="chatBox">
            <div v-if="chat.length === 0" class="chatEmpty">
              Say hi 👋
            </div>

            <div v-for="(m, i) in chat" :key="i" class="chatMsg">
              <div class="bubble">
                <div class="meta">
                  <span class="name">{{ m.from?.username || "Anon" }}</span>
                  <span class="time">{{ time(m.at) }}</span>
                </div>
                <div class="text">{{ m.message }}</div>
              </div>
            </div>
          </div>

          <div class="chatInput">
            <input
              v-model="chatText"
              class="input"
              placeholder="Message..."
              @keydown.enter="sendChat"
              :disabled="!liveId"
            />
            <button class="btn primary" @click="sendChat" :disabled="!liveId || !chatText.trim()">
              Send
            </button>
          </div>
        </aside>

        <!-- Info / Tips -->
        <div class="card infoCard">
          <div class="h2">Tips</div>
          <ul class="tips">
            <li><b>Host:</b> Start Live → share link → viewers join</li>
            <li><b>Viewer:</b> Join → watch stream → chat</li>
            <li><b>Scaling:</b> MVP supports small audiences; for big scale use an SFU (LiveKit/mediasoup)</li>
          </ul>

          <div class="line"></div>

          <div class="row">
            <div class="label">Share link</div>
            <div class="mono small">{{ shareUrl }}</div>
          </div>
          <button class="btn ghost w100" @click="copyShareLink" :disabled="!liveId">
            Copy Share Link
          </button>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const route = useRoute();
const router = useRouter();

const apiUrl = import.meta.env.VITE_API_URL;

// Your app stores user in localStorage (you already do this on Dashboard)
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

// Socket
const socket = io(apiUrl, { transports: ["websocket", "polling"] });

// Query params
const mode = ref((route.query.mode || "watch").toString()); // host | watch
const liveId = ref((route.query.liveId || "").toString());

const isHost = computed(() => mode.value === "host");
const modeLabel = computed(() => (isHost.value ? "Host" : "Watch"));

const panelOpen = ref(true);

// State
const viewerCount = ref(0);
const isLive = ref(false);
const joined = ref(false);
const ended = ref(false);
const busy = ref(false);

// Video
const videoEl = ref(null);
let localStream = null;

// Host fan-out: one peer per viewer
const peers = new Map(); // viewerSocketId -> RTCPeerConnection

// Viewer: one peer
let pcViewer = null;

// Chat
const chat = ref([]);
const chatBox = ref(null);
const chatText = ref("");

// Media toggles
const micOn = ref(true);
const camOn = ref(true);

// ICE servers (STUN + optional TURN)
const turnConfigured = !!(import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USER && import.meta.env.VITE_TURN_PASS);

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(turnConfigured
    ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USER,
        credential: import.meta.env.VITE_TURN_PASS,
      }]
    : []),
];

const shareUrl = computed(() => {
  if (!liveId.value) return "";
  return `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}`;
});

function goBack() {
  router.push("/dashboard");
}

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function time(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function scrollChatBottom() {
  nextTick(() => {
    if (!chatBox.value) return;
    chatBox.value.scrollTop = chatBox.value.scrollHeight;
  });
}

async function copyShareLink() {
  if (!liveId.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = shareUrl.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/* =========================
   CAMERA / TRACKS
========================= */
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true,
  });

  micOn.value = true;
  camOn.value = true;

  if (videoEl.value) {
    videoEl.value.srcObject = localStream;
  }
}

function stopCamera() {
  if (!localStream) return;
  localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
}

function addLocalTracks(pc) {
  if (!localStream) return;
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
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

/* =========================
   HOST: WebRTC fan-out
========================= */
async function createPeerForViewer(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: viewerSocketId,
        candidate: e.candidate,
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
  });
}

function closePeer(viewerSocketId) {
  const pc = peers.get(viewerSocketId);
  if (pc) {
    pc.close();
    peers.delete(viewerSocketId);
  }
}

async function startHost() {
  if (isLive.value || busy.value) return;
  if (!liveId.value) {
    // If user opened /live without an id, make one
    liveId.value = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  }

  busy.value = true;
  ended.value = false;

  try {
    await startCamera();
    socket.emit("live:create", { liveId: liveId.value });
    isLive.value = true;
  } catch (e) {
    alert("Camera/mic permission denied or not available.");
  } finally {
    busy.value = false;
  }
}

function endHost() {
  if (!isLive.value || busy.value) return;
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

/* =========================
   VIEWER: WebRTC receive
========================= */
function resetViewerPeer() {
  if (pcViewer) pcViewer.close();
  pcViewer = null;
  if (videoEl.value) videoEl.value.srcObject = null;
}

function joinViewer() {
  if (!liveId.value || joined.value || busy.value) return;

  busy.value = true;
  ended.value = false;

  socket.emit("live:join", { liveId: liveId.value });
  joined.value = true;

  busy.value = false;
}

function leaveViewer() {
  if (!joined.value || busy.value) return;

  busy.value = true;
  socket.emit("live:leave", { liveId: liveId.value });

  joined.value = false;
  resetViewerPeer();

  busy.value = false;
}

/* =========================
   CHAT
========================= */
function sendChat() {
  const msg = chatText.value.trim();
  if (!msg || !liveId.value) return;

  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

/* =========================
   SOCKET EVENTS
========================= */
socket.on("connect", () => {
  // register identity for nice live chat names
  if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });
});

socket.on("live:presence", ({ liveId: id, viewerCount: c }) => {
  if (id === liveId.value) viewerCount.value = c;
});

socket.on("live:chat", (m) => {
  if (m.liveId !== liveId.value) return;
  chat.value.push(m);
  scrollChatBottom();
});

socket.on("live:ended", ({ liveId: id }) => {
  if (id !== liveId.value) return;

  ended.value = true;
  isLive.value = false;
  joined.value = false;

  // viewer cleanup
  resetViewerPeer();

  // host cleanup
  for (const [vid] of peers) closePeer(vid);
  stopCamera();
});

// Host gets viewer join → create peer and send offer
socket.on("live:viewer-joined", async ({ liveId: id, viewerSocketId }) => {
  if (!isHost.value) return;
  if (!isLive.value) return;
  if (id !== liveId.value) return;

  try {
    await createPeerForViewer(viewerSocketId);
  } catch (e) {
    console.warn("createPeerForViewer failed", e);
  }
});

// Host gets viewer leave → close peer
socket.on("live:viewer-left", ({ liveId: id, viewerSocketId }) => {
  if (!isHost.value) return;
  if (id !== liveId.value) return;
  closePeer(viewerSocketId);
});

// Viewer receives offer from host
socket.on("webrtc:offer", async ({ liveId: id, from, offer }) => {
  if (isHost.value) return;          // host ignores offers
  if (!joined.value) return;
  if (id !== liveId.value) return;

  try {
    resetViewerPeer();
    pcViewer = new RTCPeerConnection({ iceServers });

    pcViewer.ontrack = (e) => {
      if (videoEl.value) videoEl.value.srcObject = e.streams[0];
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

    await pcViewer.setRemoteDescription(offer);
    const answer = await pcViewer.createAnswer();
    await pcViewer.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      liveId: liveId.value,
      to: from,
      answer: pcViewer.localDescription,
    });
  } catch (e) {
    console.warn("Viewer offer error", e);
  }
});

// Host receives answer from viewer
socket.on("webrtc:answer", async ({ liveId: id, from, answer }) => {
  if (!isHost.value) return;
  if (id !== liveId.value) return;

  const pc = peers.get(from);
  if (!pc) return;

  try {
    await pc.setRemoteDescription(answer);
  } catch (e) {
    console.warn("Host setRemoteDescription failed", e);
  }
});

// ICE for both sides
socket.on("webrtc:ice", async ({ liveId: id, from, candidate }) => {
  if (id !== liveId.value) return;

  try {
    if (isHost.value) {
      const pc = peers.get(from);
      if (pc) await pc.addIceCandidate(candidate);
    } else {
      if (pcViewer) await pcViewer.addIceCandidate(candidate);
    }
  } catch (e) {
    // Safe to ignore occasional ICE failures
  }
});

/* =========================
   MOUNT / UNMOUNT
========================= */
onMounted(() => {
  // Auto-join if watch mode & liveId provided
  if (!isHost.value && liveId.value) joinViewer();
});

onBeforeUnmount(() => {
  try {
    if (isHost.value) endHost();
    else leaveViewer();
  } catch {}

  // Don’t keep socket alive if you prefer:
  try { socket.disconnect(); } catch {}
});
</script>

<style scoped>
.livePage {
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px;
}

/* Topbar */
.topbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.title .h1 {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.2px;
}
.sub {
  margin-top: 4px;
  opacity: 0.85;
  font-size: 13px;
}
.pill {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
}
.pill.host { border-color: rgba(255,80,120,.35); background: rgba(255,80,120,.15); }
.pill.watch { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.dotSep { margin: 0 8px; opacity: .5; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }

/* Grid */
.grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  align-items: start;
}
@media (max-width: 1050px) {
  .grid { grid-template-columns: 1fr; }
}

/* Cards */
.card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
}
.videoCard { padding: 14px; }
.chatCard { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.infoCard { display: flex; flex-direction: column; gap: 10px; }

.videoHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.liveBadge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,0,0,.25);
  background: rgba(255,0,0,.12);
}

.muted { opacity: 0.8; }
.small { font-size: 12px; }

/* Video */
.videoWrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
}
.video {
  width: 100%;
  max-height: 72vh;
  display: block;
  background: #000;
}
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
  background: radial-gradient(circle at top, rgba(255,255,255,.08), rgba(0,0,0,.65));
}
.overlay.danger {
  background: radial-gradient(circle at top, rgba(255,60,60,.18), rgba(0,0,0,.70));
}
.overlayTitle { font-size: 20px; font-weight: 900; }
.overlaySub { margin-top: 6px; opacity: 0.85; }

/* Controls */
.controls {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.hint { opacity: .75; font-size: 12px; }

.row { display: flex; gap: 10px; align-items: center; }
.label { opacity: .8; font-size: 12px; }

/* Buttons */
.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.btn.primary, .chip.primary {
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
}
.btn.danger {
  background: rgba(255,80,80,.20);
  border: 1px solid rgba(255,80,80,.35);
}
.btn.ghost, .chip {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
}
.w100 { width: 100%; }

/* Chat */
.chatHeader {
  padding: 14px;
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.h2 { font-weight: 900; font-size: 16px; }
.chatBody {
  padding: 12px;
  max-height: 60vh;
  overflow: auto;
}
.chatEmpty {
  opacity: .75;
  padding: 14px;
  border-radius: 14px;
  background: rgba(0,0,0,.25);
  border: 1px dashed rgba(255,255,255,.14);
}
.chatMsg { display: flex; margin-bottom: 10px; }
.bubble {
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: .8;
}
.name { font-weight: 900; }
.text { margin-top: 6px; line-height: 1.4; }

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

/* Info */
.tips { margin: 0; padding-left: 18px; opacity: .9; }
.line { height: 1px; background: rgba(255,255,255,.10); margin: 8px 0; }
</style>