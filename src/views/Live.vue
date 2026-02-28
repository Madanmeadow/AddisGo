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
              :muted="videoMuted"
              controls
            ></video>

            <div class="overlay" v-if="overlayText">
              <div class="overlayTitle">{{ overlayText }}</div>
              <div class="overlaySub">{{ overlaySub }}</div>

              <!-- iOS autoplay helper -->
              <button
                v-if="showTapToPlay"
                class="btn primary mt12"
                @click="userTapPlay"
              >
                Tap to Play
              </button>

              <button
                v-if="showTapToUnmute"
                class="btn ghost mt10"
                @click="userTapUnmute"
              >
                Tap to Unmute
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

              <!-- viewer mic request / publish audio -->
              <button class="btn ghost" @click="requestMic" :disabled="!joined || busy || micRequested">
                🎤 Request Mic
              </button>

              <button
                class="btn primary"
                @click="startMicPublish"
                :disabled="!joined || busy || !canSpeak || publishingMic"
              >
                Start Mic
              </button>

              <button
                class="btn danger"
                @click="stopMicPublish"
                :disabled="!publishingMic"
              >
                Stop Mic
              </button>
            </template>

            <div class="hint">
              <span v-if="iceMode === 'STUN only'">⚠️ TURN not available (some networks may fail)</span>
              <span v-else>✅ TURN enabled (reliable on mobile networks)</span>
              <span class="dot">•</span>
              <span class="pill" :class="canSpeak ? 'ok' : 'warn'">
                Mic: {{ canSpeak ? "Approved" : "Not approved" }}
              </span>
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
                  <b>{{ m.from?.username || m.fromName || "Anon" }}</b>
                  <span class="small muted">{{ fmtTime(m.at || m.createdAt || m.created_at) }}</span>
                </div>
                <div class="msgText">{{ m.message || m.text }}</div>
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
            <li><b>iPhone/iPad</b> may require Tap-to-Play (autoplay restrictions).</li>
            <li>For huge audiences later: upgrade to <b>SFU</b> (LiveKit/mediasoup).</li>
          </ul>

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

// viewer mic approval
const canSpeak = ref(false);
const micRequested = ref(false);
const publishingMic = ref(false);

// iOS autoplay helpers
const showTapToPlay = ref(false);
const showTapToUnmute = ref(false);

// ICE servers
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some((s) => {
    const u = s.urls;
    const list = Array.isArray(u) ? u : [u];
    return list.some((x) => String(x || "").includes("turn:") || String(x || "").includes("turns:"));
  });
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// Host fan-out peers
const peers = new Map(); // viewerSocketId -> RTCPeerConnection
const peerCount = computed(() => peers.size);

// Viewer peer
let pcViewer = null;

// socket
const socket = io(apiUrl, { transports: ["websocket", "polling"] });

// share
const shareUrl = computed(() =>
  liveId.value ? `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}` : ""
);

const statusText = computed(() => {
  if (ended.value) return "ended";
  if (isHost.value) return isLive.value ? "broadcasting" : "ready";
  return joined.value ? "watching" : "not joined";
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

// Autoplay rules:
// - Host can stay muted (local preview) to avoid echo.
// - Viewer: start muted to allow autoplay on iOS. User can tap to unmute.
const videoMuted = computed(() => {
  if (isHost.value) return true;
  return true; // always start muted for iOS autoplay safety
});

// helpers
function fmtTime(iso) {
  try {
    if (!iso) return "";
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

// Load ICE from backend (Twilio TURN)
async function loadIceServers() {
  try {
    const r = await fetch(`${apiUrl}/api/turn`);
    const data = await r.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
    }
  } catch {
    // keep STUN fallback
  }
}

// camera
async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true,
  });
  micOn.value = true;
  camOn.value = true;
  if (videoEl.value) {
    videoEl.value.srcObject = localStream;
    try { await videoEl.value.play(); } catch {}
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

// viewer reset
function resetViewerPeer() {
  if (pcViewer) pcViewer.close();
  pcViewer = null;
  if (videoEl.value) videoEl.value.srcObject = null;
  showTapToPlay.value = false;
  showTapToUnmute.value = false;
  publishingMic.value = false;
}

// host peers
function closePeer(viewerSocketId) {
  const pc = peers.get(viewerSocketId);
  if (pc) {
    pc.close();
    peers.delete(viewerSocketId);
  }
}

async function createPeerForViewer(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

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

  socket.emit("live:leave", { liveId: liveId.value }); // backend may ignore; ok.
  joined.value = false;
  resetViewerPeer();

  busy.value = false;
}

// Viewer mic request/publish
function requestMic() {
  if (!joined.value || !liveId.value) return;
  micRequested.value = true;
  socket.emit("live:mic:request", { liveId: liveId.value });
}

async function startMicPublish() {
  if (!joined.value || !canSpeak.value) return;
  if (!pcViewer) return alert("Join first (need connection).");

  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const track = micStream.getAudioTracks()[0];
    if (!track) return;

    // add mic track to the existing viewer connection
    pcViewer.addTrack(track, micStream);

    // renegotiate (viewer creates offer to host)
    const offer = await pcViewer.createOffer();
    await pcViewer.setLocalDescription(offer);

    // send to host (pcViewer’s remote peer = host socket id in last offer event)
    // we store it in lastHostSocketId when offer arrives
    if (!lastHostSocketId.value) return alert("Host not found. Re-join.");

    socket.emit("webrtc:offer", {
      liveId: liveId.value,
      to: lastHostSocketId.value,
      offer: pcViewer.localDescription,
    });

    publishingMic.value = true;
  } catch (e) {
    alert("Mic permission denied.");
  }
}

function stopMicPublish() {
  // simplest: just reset viewer peer (clean)
  resetViewerPeer();
  joined.value = false;
  setTimeout(() => joinViewer(), 150);
}

// Chat
function sendChat() {
  const msg = chatText.value.trim();
  if (!msg || !liveId.value) return;
  socket.emit("live:chat", { liveId: liveId.value, message: msg });
  chatText.value = "";
}

// iOS helpers
async function userTapPlay() {
  if (!videoEl.value) return;
  try {
    await videoEl.value.play();
    showTapToPlay.value = false;
    showTapToUnmute.value = true; // allow user to unmute after gesture
  } catch {}
}

function userTapUnmute() {
  if (!videoEl.value) return;
  videoEl.value.muted = false;
  showTapToUnmute.value = false;
}

// SOCKET EVENTS
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

  resetViewerPeer();
  for (const [vid] of peers) closePeer(vid);
  stopCamera();
});

// mic status updates
socket.on("live:mic:status", ({ liveId: id, canSpeak: ok }) => {
  if (id !== liveId.value) return;
  canSpeak.value = !!ok;
});
socket.on("live:mic:approved", ({ liveId: id }) => {
  if (id !== liveId.value) return;
  canSpeak.value = true;
});
socket.on("live:mic:denied", ({ liveId: id }) => {
  if (id !== liveId.value) return;
  canSpeak.value = false;
});

// Host: viewer joined
socket.on("live:viewer-joined", async ({ liveId: id, viewerSocketId }) => {
  if (!isHost.value || !isLive.value) return;
  if (id !== liveId.value) return;
  try {
    await createPeerForViewer(viewerSocketId);
  } catch {}
});

// Viewer: offer from host
const lastHostSocketId = ref("");
socket.on("webrtc:offer", async ({ liveId: id, from, offer }) => {
  if (isHost.value || !joined.value) return;
  if (id !== liveId.value) return;

  try {
    lastHostSocketId.value = String(from);

    resetViewerPeer();
    pcViewer = new RTCPeerConnection({ iceServers: iceServers.value });

    pcViewer.ontrack = async (e) => {
      if (!videoEl.value) return;

      videoEl.value.srcObject = e.streams[0];

      // ✅ iOS autoplay fix: start muted, try play(), show button if blocked
      videoEl.value.muted = true;

      try {
        await videoEl.value.play();
        showTapToPlay.value = false;
        showTapToUnmute.value = true;
      } catch {
        showTapToPlay.value = true;
        showTapToUnmute.value = false;
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
.wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.centerTitle .titleRow { display: flex; align-items: center; gap: 10px; }
.title { font-weight: 900; font-size: 22px; }
.metaRow { margin-top: 4px; opacity: 0.85; font-size: 13px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.dot { opacity: 0.5; }
.rightBtns { display: flex; gap: 10px; }

.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }

.grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: start; }
@media (max-width: 1050px) { .grid { grid-template-columns: 1fr; } }

.card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
}

.videoTop { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.small { font-size: 12px; }
.muted { opacity: 0.8; }

.videoWrap { position: relative; border-radius: 16px; overflow: hidden; background: #000; }
.video { width: 100%; max-height: 72vh; background: #000; display: block; }

.overlay {
  position: absolute; inset: 0; display: grid; place-items: center;
  text-align: center; padding: 24px;
  background: radial-gradient(circle at top, rgba(255,255,255,.08), rgba(0,0,0,.70));
}
.overlayTitle { font-size: 20px; font-weight: 900; }
.overlaySub { margin-top: 6px; opacity: 0.85; }

.controls { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.hint { opacity: .85; font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.pill { padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); }
.pill.ok { background: rgba(0,255,120,.12); border-color: rgba(0,255,120,.25); }
.pill.warn { background: rgba(255,200,0,.12); border-color: rgba(255,200,0,.25); }

.chatCard { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.chatHead { padding: 14px; border-bottom: 1px solid rgba(255,255,255,.10); }
.chatTitle { font-weight: 900; font-size: 16px; }

.chatBody { padding: 12px; max-height: 60vh; overflow: auto; }
.empty { opacity: .75; padding: 14px; border-radius: 14px; background: rgba(0,0,0,.25); border: 1px dashed rgba(255,255,255,.14); }
.msg { margin-bottom: 10px; }
.bubble { padding: 10px 12px; border-radius: 14px; background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.10); }
.msgMeta { display: flex; justify-content: space-between; gap: 10px; }
.msgText { margin-top: 6px; line-height: 1.4; }

.chatInput { padding: 12px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,.10); }
.input {
  flex: 1; background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white; padding: 10px 12px; border-radius: 12px; outline: none;
}

.infoCard { display: flex; flex-direction: column; gap: 10px; }
.infoTitle { font-weight: 900; }
.list { margin: 0; padding-left: 18px; opacity: .9; }
.divider { height: 1px; background: rgba(255,255,255,.10); margin: 8px 0; }
.shareBlock { display: grid; gap: 8px; }

.btn, .chip {
  border: none; border-radius: 999px; padding: 10px 14px;
  cursor: pointer; background: rgba(255,255,255,0.12); color: white;
}
.btn.primary, .chip.primary { background: linear-gradient(45deg,#19d3a2,#13b5ff); }
.btn.danger { background: rgba(255,80,80,.20); border: 1px solid rgba(255,80,80,.35); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }
.btn:disabled, .chip:disabled { opacity: .5; cursor: not-allowed; }

.badge {
  font-size: 12px; padding: 5px 10px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06);
}
.badge.host { border-color: rgba(255,80,120,.35); background: rgba(255,80,120,.15); }
.badge.watch { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.live { border-color: rgba(255,0,0,.25); background: rgba(255,0,0,.12); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }

.mt12 { margin-top: 12px; }
.mt10 { margin-top: 10px; }
.w100 { width: 100%; }
</style>