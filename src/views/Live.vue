<!-- src/views/Live.vue -->
<template>
  <Layout>
    <div class="liveWrap">
      <div class="bg-animated" aria-hidden="true"></div>

      <header class="topbar">
        <div class="left">
          <button class="chip ghost" @click="goBack">← Back</button>

          <div class="pill">
            <span class="dot on"></span>
            <span class="t">LIVE</span>
            <span class="s">{{ mode.toUpperCase() }} • {{ liveId }}</span>
          </div>

          <div class="watchers" v-if="viewerCount > 0">
            👀 {{ viewerCount }} watching
          </div>
        </div>

        <div class="right">
          <!-- Watcher mic tools -->
          <button
            v-if="mode === 'watch'"
            class="chip ghost"
            @click="toggleWatcherMic"
            :disabled="micRequestPending"
            title="Enable/disable your mic (only if host approves)"
          >
            {{ watcherMicEnabled ? "🎙️ Mic On" : "🔇 Mic" }}
          </button>

          <button
            v-if="mode === 'watch'"
            class="chip ghost"
            @click="requestMic"
            :disabled="micRequestPending"
            title="Ask host to let you speak"
          >
            {{ micRequestPending ? "⏳ Requested" : "🎤 Request Mic" }}
          </button>

          <!-- Host controls -->
          <button class="chip ghost" @click="toggleMute">
            {{ muted ? "🔇 Muted" : "🎙️ Mic" }}
          </button>

          <button v-if="mode === 'host'" class="chip ghost" @click="toggleCamera">
            {{ cameraOff ? "📷 Off" : "📹 Cam" }}
          </button>

          <button class="chip ghost" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Chat" }}</button>

          <button
            class="chip ghost ok"
            v-if="status === 'failed' || status === 'connecting'"
            @click="reconnectNow"
          >
            ♻️ Reconnect
          </button>

          <button class="chip danger" @click="endLive">{{ mode === "host" ? "End Live" : "Leave" }}</button>
        </div>
      </header>

      <main class="stage">
        <section class="playerCard">
          <div class="playerTop">
            <div class="title">🔴 AddisGo Live</div>
            <div class="meta">
              <span class="tag">{{ mode === "host" ? "HOSTING" : "WATCHING" }}</span>
              <span class="small muted">{{ statusLabel }}</span>
            </div>

            <div class="actions">
              <button class="chip ghost mini" @click="toggleFullscreen">⛶ Fullscreen</button>
            </div>
          </div>

          <div class="videoWrap">
            <video ref="videoEl" class="video" autoplay playsinline :muted="mode === 'host'"></video>

            <div v-if="overlayTip" class="overlayTip">
              <div class="overlayText">{{ overlayTip }}</div>
              <div class="overlayBtns">
                <button class="chip mini ghost" @click="overlayTip = ''">OK</button>
                <button class="chip mini ghost ok" v-if="status === 'failed' || status === 'connecting'" @click="reconnectNow">
                  Reconnect
                </button>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>

          <!-- HOST: mic requests -->
          <div v-if="mode === 'host' && micRequests.length" class="micPanel">
            <div class="micTitle">🎤 Mic Requests</div>
            <div class="micReq" v-for="r in micRequests" :key="r.reqId">
              <div class="micWho">
                {{ r.fromName || ("User #" + (r.fromUserId || "?")) }}
              </div>
              <div class="micBtns">
                <button class="chip mini ghost" @click="denyMic(r)">Deny</button>
                <button class="chip mini ok" @click="approveMic(r)">Allow</button>
              </div>
            </div>
            <div class="micHint">
              If your server doesn’t relay <code>live:mic:*</code> events yet, mic-requests will show but won’t connect audio.
            </div>
          </div>
        </section>

        <aside class="chat" :class="{ open: chatOpen }">
          <div class="chatHead">
            <div class="chatTitle">💬 Live Chat</div>
            <button class="chip mini ghost" @click="toggleChat">✕</button>
          </div>

          <div class="chatBody" ref="chatBoxRef">
            <div v-for="(m, i) in messages" :key="i" class="msg">
              <div class="msgTop">
                <span class="who">{{ m.from }}</span>
                <span class="time">{{ m.created_at ? formatDate(m.created_at) : "" }}</span>
              </div>
              <div class="text">{{ m.text }}</div>
            </div>
          </div>

          <div class="chatInput">
            <input v-model="chatText" placeholder="Say something…" @keydown.enter.prevent="sendMessage" />
            <button class="chip" @click="sendMessage">Send</button>
          </div>
        </aside>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

/**
 * ✅ Event names:
 * Keep your existing live system working, but add extra optional events.
 * If server ignores unknown events, everything still works.
 */
const EVT = {
  join: "live:join",           // { liveId, mode }
  leave: "live:leave",         // { liveId }
  watcher: "live:watcher",     // -> host { watcherId, name?, userId? }
  offer: "live:offer",         // host -> watcher { liveId, to, sdp }
  answer: "live:answer",       // watcher -> host { liveId, to:'host', sdp }
  ice: "live:ice",             // both ways { liveId, to?, candidate }

  chat: "live:chat",           // both ways { liveId, from, text, created_at }

  // optional viewer count (server can emit any of these)
  viewers: "live:viewers",
  viewerCount: "live:viewerCount",

  // mic request (optional)
  micRequest: "live:mic:request",  // watcher -> host { liveId, reqId, fromUserId, fromName }
  micGrant: "live:mic:grant",      // host -> watcher { liveId, reqId, allowed:true/false }
  micOffer: "live:mic:offer",      // watcher -> host { liveId, sdp }
  micAnswer: "live:mic:answer",    // host -> watcher { liveId, sdp }
  micIce: "live:mic:ice",          // both { liveId, candidate }
};

const apiUrl = import.meta.env.VITE_API_URL;

const route = useRoute();
const router = useRouter();

const mode = String(route.query.mode || "watch"); // host | watch
const liveId = String(route.query.liveId || "");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const status = ref("connecting"); // connecting | live | ended | failed
const statusLabel = computed(() => {
  if (status.value === "live") return "Streaming";
  if (status.value === "ended") return "Ended";
  if (status.value === "failed") return "Connection failed";
  return "Connecting…";
});

const error = ref("");
const overlayTip = ref("");

const videoEl = ref(null);

let socket = null;
let localStream = null;

// host: many peer connections (watcherId -> pc)
const peers = new Map();

// watch: one peer connection
let watchPc = null;

const muted = ref(false);
const cameraOff = ref(false);

const chatOpen = ref(true);
const chatText = ref("");
const messages = ref([]);
const chatBoxRef = ref(null);

const viewerCount = ref(0);

// watcher mic request feature
const micRequestPending = ref(false);
const watcherMicEnabled = ref(false);
let watcherMicStream = null;

// host mic requests list
const micRequests = ref([]); // [{reqId, fromUserId, fromName, watcherId?}]
let micUplinkPcWatcher = null; // watcher -> host uplink pc
let micDownlinkPcHost = null;  // host receives uplink

function formatDate(d) {
  try {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString();
  } catch {
    return "";
  }
}

function scrollChat() {
  const el = chatBoxRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function toggleChat() {
  chatOpen.value = !chatOpen.value;
}

function goBack() {
  router.push("/dashboard");
}

function safeStopTracks(stream) {
  try { stream?.getTracks?.().forEach((t) => t.stop()); } catch {}
}

function setMicEnabled(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
}

function setCamEnabled(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
}

function toggleMute() {
  muted.value = !muted.value;
  setMicEnabled(!muted.value);
}

function toggleCamera() {
  cameraOff.value = !cameraOff.value;
  setCamEnabled(!cameraOff.value);
}

async function toggleFullscreen() {
  const el = videoEl.value;
  if (!el) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  } catch {
    // iOS Safari sometimes uses native fullscreen
  }
}

function endLive() {
  status.value = "ended";
  cleanup();
  router.push("/dashboard");
}

/* =========================
   Media (host)
========================= */
async function getHostMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });
    videoEl.value.srcObject = localStream;
    await videoEl.value.play().catch(() => {});
    setMicEnabled(!muted.value);
    setCamEnabled(!cameraOff.value);
  } catch {
    error.value = "Camera/Mic blocked. Allow permissions then retry.";
    overlayTip.value = "Allow Camera & Microphone permissions to host live.";
    status.value = "failed";
  }
}

/* =========================
   WebRTC helpers
========================= */
function makePC() {
  return new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  });
}

function setFailed(msg = "Connection failed. Tap Reconnect.") {
  status.value = "failed";
  overlayTip.value = msg;
}

/* HOST: create offer per watcher */
async function hostCreateOfferForWatcher(watcherId) {
  if (!localStream) return;

  const pc = makePC();
  peers.set(watcherId, pc);

  // add tracks
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket?.emit(EVT.ice, { liveId, to: watcherId, role: "host", candidate: e.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "failed") setFailed("Connection failed. Tap Reconnect.");
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket?.emit(EVT.offer, { liveId, to: watcherId, role: "host", sdp: offer });
}

/* HOST: accept answer from watcher */
async function hostAcceptAnswer(fromWatcherId, sdp) {
  const pc = peers.get(fromWatcherId);
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

/* HOST: add ice from watcher */
async function hostAddIce(fromWatcherId, candidate) {
  const pc = peers.get(fromWatcherId);
  if (!pc || !candidate) return;
  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
}

/* WATCH: join + receive offer -> answer */
async function watchSetupPC() {
  watchPc = makePC();

  watchPc.ontrack = (e) => {
    const [stream] = e.streams || [];
    if (stream) {
      videoEl.value.srcObject = stream;
      videoEl.value.play().catch(() => {});
      status.value = "live";
      overlayTip.value = "";
    }
  };

  watchPc.onicecandidate = (e) => {
    if (e.candidate) {
      socket?.emit(EVT.ice, { liveId, to: "host", role: "watch", candidate: e.candidate });
    }
  };

  watchPc.onconnectionstatechange = () => {
    const st = watchPc?.connectionState;
    if (st === "failed") setFailed("Connection failed. Tap Reconnect.");
  };
}

async function watchHandleOffer(sdp, fromWatcherIdMaybe) {
  if (!watchPc) await watchSetupPC();
  await watchPc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await watchPc.createAnswer();
  await watchPc.setLocalDescription(answer);
  socket?.emit(EVT.answer, { liveId, to: "host", role: "watch", sdp: answer, from: fromWatcherIdMaybe });
}

async function watchAddIce(candidate) {
  try {
    if (watchPc && candidate) await watchPc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

/* =========================
   Mic request feature (optional)
   - Viewer requests mic -> host approves -> viewer creates audio-only uplink
   - Requires server to relay EVT.mic* events
========================= */
async function toggleWatcherMic() {
  watcherMicEnabled.value = !watcherMicEnabled.value;
  // we only actually send audio if host grants
  if (!watcherMicEnabled.value) {
    safeStopTracks(watcherMicStream);
    watcherMicStream = null;
  }
}

async function requestMic() {
  if (mode !== "watch") return;
  if (!socket) return;

  micRequestPending.value = true;
  const reqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  socket.emit(EVT.micRequest, {
    liveId,
    reqId,
    fromUserId: me?.id || null,
    fromName: me?.username || "viewer",
  });

  overlayTip.value = "Mic requested. Waiting for host approval…";

  // failsafe if server doesn’t support
  setTimeout(() => {
    if (micRequestPending.value) {
      overlayTip.value = "If nothing happens: your server may not relay mic-request events yet.";
    }
  }, 3500);
}

/* HOST: approve/deny mic */
function approveMic(r) {
  socket?.emit(EVT.micGrant, { liveId, reqId: r.reqId, allowed: true, toUserId: r.fromUserId });
  micRequests.value = micRequests.value.filter((x) => x.reqId !== r.reqId);
}
function denyMic(r) {
  socket?.emit(EVT.micGrant, { liveId, reqId: r.reqId, allowed: false, toUserId: r.fromUserId });
  micRequests.value = micRequests.value.filter((x) => x.reqId !== r.reqId);
}

/* WATCH: build uplink audio to host after grant */
async function watcherStartMicUplink() {
  if (!watcherMicEnabled.value) watcherMicEnabled.value = true;

  if (!watcherMicStream) {
    watcherMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  micUplinkPcWatcher = makePC();
  watcherMicStream.getTracks().forEach((t) => micUplinkPcWatcher.addTrack(t, watcherMicStream));

  micUplinkPcWatcher.onicecandidate = (e) => {
    if (e.candidate) socket?.emit(EVT.micIce, { liveId, role: "watch", candidate: e.candidate });
  };

  const offer = await micUplinkPcWatcher.createOffer();
  await micUplinkPcWatcher.setLocalDescription(offer);
  socket?.emit(EVT.micOffer, { liveId, sdp: offer });
}

/* HOST: receive mic uplink offer */
async function hostHandleMicOffer(sdp) {
  micDownlinkPcHost = makePC();
  micDownlinkPcHost.onicecandidate = (e) => {
    if (e.candidate) socket?.emit(EVT.micIce, { liveId, role: "host", candidate: e.candidate });
  };

  // When host receives viewer audio, we can optionally play it locally
  micDownlinkPcHost.ontrack = (e) => {
    // optional: play remote mic audio quietly (debug)
    // const a = new Audio();
    // a.srcObject = e.streams[0];
    // a.play().catch(()=>{});
  };

  await micDownlinkPcHost.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await micDownlinkPcHost.createAnswer();
  await micDownlinkPcHost.setLocalDescription(answer);
  socket?.emit(EVT.micAnswer, { liveId, sdp: answer });
}

/* WATCH: complete mic uplink handshake */
async function watcherHandleMicAnswer(sdp) {
  if (!micUplinkPcWatcher) return;
  await micUplinkPcWatcher.setRemoteDescription(new RTCSessionDescription(sdp));
}

/* mic ICE */
async function handleMicIce(role, candidate) {
  try {
    if (role === "host") {
      // host sending ICE -> watcher applies on watcher pc
      if (micUplinkPcWatcher && candidate) await micUplinkPcWatcher.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      // watcher sending ICE -> host applies on host pc
      if (micDownlinkPcHost && candidate) await micDownlinkPcHost.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch {}
}

/* =========================
   Chat
========================= */
function sendMessage() {
  const text = chatText.value.trim();
  if (!text) return;
  const payload = { liveId, from: me?.username || "me", text, created_at: new Date().toISOString() };
  socket?.emit(EVT.chat, payload);
  chatText.value = "";
}

/* =========================
   Reconnect logic
========================= */
let reconnectTimer = null;

function clearReconnectTimer() {
  try { if (reconnectTimer) clearTimeout(reconnectTimer); } catch {}
  reconnectTimer = null;
}

async function reconnectNow() {
  clearReconnectTimer();
  overlayTip.value = "Reconnecting…";
  status.value = "connecting";

  // close all webrtc
  try {
    peers.forEach((pc) => { try { pc.close(); } catch {} });
    peers.clear();
  } catch {}
  try { watchPc?.close(); } catch {}
  watchPc = null;

  try { micUplinkPcWatcher?.close(); } catch {}
  micUplinkPcWatcher = null;
  try { micDownlinkPcHost?.close(); } catch {}
  micDownlinkPcHost = null;

  // keep host stream (don’t stop camera) for smoother reconnect
  // but if it’s missing, reacquire
  if (mode === "host" && !localStream) await getHostMedia();

  // rebuild socket
  try { socket?.disconnect(); } catch {}
  socket = null;

  initSocket();
}

function scheduleAutoReconnect() {
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectNow();
  }, 1500);
}

/* =========================
   Socket init
========================= */
function initSocket() {
  socket = io(apiUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
  });

  socket.on("connect", async () => {
    error.value = "";
    overlayTip.value = "";

    socket.emit(EVT.join, { liveId, mode, userId: me?.id || null, name: me?.username || null });

    // many servers need watcher “register”
    if (mode === "watch") socket.emit("watcher", { liveId, userId: me?.id || null, name: me?.username || null });

    if (mode === "host") {
      if (!localStream) await getHostMedia();
      status.value = localStream ? "live" : "failed";
    } else {
      await watchSetupPC();
      status.value = "connecting";
    }
  });

  socket.on("disconnect", () => {
    if (status.value !== "ended") {
      status.value = "connecting";
      overlayTip.value = "Disconnected. Reconnecting…";
      scheduleAutoReconnect();
    }
  });

  socket.on("connect_error", () => {
    if (status.value !== "ended") setFailed("Socket connection failed. Tap Reconnect.");
  });

  // HOST: server tells host a watcher joined
  socket.on(EVT.watcher, async (payload = {}) => {
    if (mode !== "host") return;
    const watcherId = payload.watcherId || payload.id || payload.socketId;
    if (!watcherId) return;
    await hostCreateOfferForWatcher(watcherId);
  });

  // WATCH: receive offer (accept multiple payload shapes)
  socket.on(EVT.offer, async (payload = {}) => {
    if (mode !== "watch") return;
    const sdp = payload.sdp || payload.offer;
    if (!sdp) return;
    await watchHandleOffer(sdp, payload.from || payload.hostId);
  });

  // HOST: receive answer
  socket.on(EVT.answer, async (payload = {}) => {
    if (mode !== "host") return;
    const sdp = payload.sdp || payload.answer;
    const id = payload.watcherId || payload.from || payload.id;
    if (id && sdp) await hostAcceptAnswer(id, sdp);
  });

  // ICE (both)
  socket.on(EVT.ice, async (payload = {}) => {
    const candidate = payload.candidate;
    const id = payload.watcherId || payload.from || payload.id;
    if (mode === "host") {
      if (id) await hostAddIce(id, candidate);
    } else {
      await watchAddIce(candidate);
    }
  });

  // Chat
  socket.on(EVT.chat, async (msg) => {
    if (!msg) return;
    messages.value.push(msg);
    await nextTick();
    scrollChat();
  });

  // Viewer count (support both)
  socket.on(EVT.viewerCount, (n) => {
    const num = Number(n);
    if (!Number.isNaN(num)) viewerCount.value = num;
  });
  socket.on(EVT.viewers, (payload) => {
    // payload could be {count} or array of viewers
    if (Array.isArray(payload)) viewerCount.value = payload.length;
    else if (payload && typeof payload === "object") {
      const num = Number(payload.count);
      if (!Number.isNaN(num)) viewerCount.value = num;
    }
  });

  // Mic request (host receives)
  socket.on(EVT.micRequest, (p = {}) => {
    if (mode !== "host") return;
    micRequests.value.unshift({
      reqId: p.reqId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      fromUserId: p.fromUserId || null,
      fromName: p.fromName || p.name || null,
    });
  });

  // Watcher receives grant
  socket.on(EVT.micGrant, async (p = {}) => {
    if (mode !== "watch") return;
    micRequestPending.value = false;

    if (!p.allowed) {
      overlayTip.value = "Host denied mic request.";
      return;
    }

    overlayTip.value = "Host approved. Turning on your mic…";
    try {
      await watcherStartMicUplink();
      overlayTip.value = "Mic connected ✅";
    } catch {
      overlayTip.value = "Mic failed. Check permissions.";
    }
  });

  // Mic signaling
  socket.on(EVT.micOffer, async (p = {}) => {
    if (mode !== "host") return;
    const sdp = p.sdp;
    if (sdp) await hostHandleMicOffer(sdp);
  });

  socket.on(EVT.micAnswer, async (p = {}) => {
    if (mode !== "watch") return;
    const sdp = p.sdp;
    if (sdp) await watcherHandleMicAnswer(sdp);
  });

  socket.on(EVT.micIce, async (p = {}) => {
    const role = p.role; // "host" or "watch"
    const candidate = p.candidate;
    if (!role || !candidate) return;
    await handleMicIce(role, candidate);
  });
}

/* =========================
   Init / Cleanup
========================= */
function cleanup() {
  clearReconnectTimer();

  try { socket?.emit(EVT.leave, { liveId }); } catch {}

  try {
    peers.forEach((pc) => { try { pc.close(); } catch {} });
    peers.clear();
  } catch {}

  try { watchPc?.close(); } catch {}
  watchPc = null;

  try { micUplinkPcWatcher?.close(); } catch {}
  micUplinkPcWatcher = null;
  try { micDownlinkPcHost?.close(); } catch {}
  micDownlinkPcHost = null;

  safeStopTracks(watcherMicStream);
  watcherMicStream = null;

  // host media: stop on exit
  safeStopTracks(localStream);
  localStream = null;

  try { socket?.disconnect(); } catch {}
  socket = null;
}

onMounted(async () => {
  if (!liveId) {
    error.value = "Missing liveId";
    status.value = "failed";
    return;
  }
  initSocket();
});

onBeforeUnmount(() => cleanup());
</script>

<style scoped>
.liveWrap{
  min-height: 100vh;
  padding-bottom: 18px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.bg-animated{
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(900px 650px at 20% 10%, rgba(255, 75, 43, 0.18), transparent 60%),
    radial-gradient(850px 650px at 80% 20%, rgba(255, 65, 108, 0.16), transparent 60%),
    radial-gradient(950px 700px at 50% 110%, rgba(124, 58, 237, 0.14), transparent 60%),
    radial-gradient(700px 520px at 10% 80%, rgba(34, 197, 94, 0.10), transparent 60%),
    linear-gradient(180deg, #0b1220, #070b14);
  filter: saturate(115%) contrast(105%);
  animation: bgFloat 14s ease-in-out infinite;
}
@keyframes bgFloat{
  0%{transform:translate3d(0,0,0) scale(1)}
  25%{transform:translate3d(-18px,-10px,0) scale(1.02)}
  50%{transform:translate3d(12px,-16px,0) scale(1.03)}
  75%{transform:translate3d(18px,8px,0) scale(1.02)}
  100%{transform:translate3d(0,0,0) scale(1)}
}
.liveWrap > *:not(.bg-animated){ position: relative; z-index: 1; }

.topbar{
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 14px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.left{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; }
.right{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

.watchers{
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  font-weight: 900;
  opacity: .9;
}

.pill{
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}
.dot{ width:10px; height:10px; border-radius:50%; background:#ff3b3b; box-shadow: 0 0 16px rgba(255,59,59,.5); }
.dot.on{ animation: pulse 1.6s infinite; }
@keyframes pulse{
  0%{ box-shadow:0 0 0 0 rgba(255,59,59,.55) }
  70%{ box-shadow:0 0 0 10px rgba(255,59,59,0) }
  100%{ box-shadow:0 0 0 0 rgba(255,59,59,0) }
}
.t{ font-weight: 950; letter-spacing:.3px; }
.s{ opacity:.75; font-size: 12px; }

.chip{
  border:none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor:pointer;
  background: rgba(255,255,255,.12);
  color:#fff;
  font-weight: 900;
}
.chip.ghost{ background: rgba(255,255,255,.10); }
.chip.danger{ background: rgba(255,80,80,.20); border:1px solid rgba(255,80,80,.35); }
.chip.ok{ background: rgba(34,197,94,.18); border:1px solid rgba(34,197,94,.28); }
.chip.mini{ padding: 8px 10px; font-size: 12px; }

.stage{
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  display:grid;
  grid-template-columns: 1fr 380px;
  gap: 14px;
  align-items:start;
}

.playerCard{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
}

.playerTop{
  display:flex;
  gap: 10px;
  justify-content:space-between;
  align-items:center;
  flex-wrap:wrap;
  margin-bottom: 10px;
}
.title{ font-weight: 950; }
.meta{ display:flex; gap: 10px; align-items:center; flex-wrap:wrap; }
.tag{
  font-weight: 950;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 12px;
}
.small{ font-size: 12px; }
.muted{ opacity:.75; }

.videoWrap{
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.10);
}
.video{
  width: 100%;
  height: auto;
  display:block;
  max-height: 76vh;
  object-fit: cover;
  background:#000;
}

.overlayTip{
  position:absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display:flex;
  justify-content:space-between;
  gap: 10px;
  align-items:center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  font-weight: 900;
}
.overlayText{ flex: 1; }
.overlayBtns{ display:flex; gap: 8px; }

.alert{
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,.18);
  border: 1px solid rgba(255,80,80,.35);
}

/* Host mic request panel */
.micPanel{
  margin-top: 12px;
  border-radius: 16px;
  padding: 12px;
  background: rgba(0,0,0,.32);
  border: 1px solid rgba(255,255,255,.12);
}
.micTitle{ font-weight: 950; margin-bottom: 8px; }
.micReq{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  margin-bottom: 8px;
}
.micWho{ font-weight: 900; opacity:.95; }
.micBtns{ display:flex; gap: 8px; }
.micHint{ opacity:.75; font-size: 12px; margin-top: 8px; }

.chat{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 12px;
  backdrop-filter: blur(10px);
  display:flex;
  flex-direction: column;
  min-height: 520px;
}
.chatHead{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom: 10px;
}
.chatTitle{ font-weight: 950; }

.chatBody{
  flex: 1;
  overflow:auto;
  display:grid;
  gap: 10px;
  padding: 10px;
  background: rgba(0,0,0,.25);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
}
.msg{
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}
.msgTop{ display:flex; justify-content:space-between; gap: 10px; }
.who{ font-weight: 950; }
.time{ opacity:.7; font-size: 12px; }
.text{ margin-top: 6px; line-height: 1.45; }

.chatInput{
  display:flex;
  gap: 8px;
  margin-top: 10px;
}
.chatInput input{
  flex: 1;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}

@media (max-width: 980px){
  .stage{ grid-template-columns: 1fr; }
  .chat{ min-height: 420px; }
}
</style>