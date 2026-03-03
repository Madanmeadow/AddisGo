<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="callWrap">
      <div class="bg-animated" aria-hidden="true"></div>

      <header class="topbar">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="pill">
          <span class="dot" :class="{ on: connected }"></span>
          <span class="t">CALL</span>
          <span class="s">
            {{ kind.toUpperCase() }} • {{ role.toUpperCase() }} • {{ roomId }}
          </span>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMute">{{ muted ? "🔇 Muted" : "🎙️ Mic" }}</button>
          <button v-if="kind === 'video'" class="chip ghost" @click="toggleCam">
            {{ camOff ? "📷 Camera Off" : "📷 Camera" }}
          </button>
          <button class="chip danger" @click="endCall">⛔ End</button>
        </div>
      </header>

      <main class="grid">
        <section class="stage">
          <div class="stageInner" :class="{ video: kind === 'video' }">
            <video
              v-if="kind === 'video'"
              ref="remoteVideo"
              class="remote"
              autoplay
              playsinline
            ></video>

            <div v-else class="audioOnly">
              <div class="ringIcon">📞</div>
              <div class="ringTitle">Audio Call</div>
              <div class="ringSub">{{ statusText }}</div>
            </div>

            <video
              v-if="kind === 'video'"
              ref="localVideo"
              class="local"
              autoplay
              playsinline
              muted
            ></video>

            <div class="hud">
              <div class="hudRow">
                <span class="badge" :class="{ ok: pcReady }">Peer</span>
                <span class="badge" :class="{ ok: mediaReady }">Media</span>
                <span class="badge" :class="{ ok: iceConnected }">ICE</span>
                <span class="badge" :class="{ ok: connected }">Socket</span>
              </div>

              <div class="hudRow small">
                <span>ICE: {{ iceState }}</span>
                <span class="sep">•</span>
                <span>Conn: {{ connState }}</span>
                <span class="sep">•</span>
                <span>Sig: {{ sigState }}</span>
              </div>

              <div v-if="errorText" class="errorBox">⚠️ {{ errorText }}</div>
              <div v-else class="hintBox">{{ statusText }}</div>
            </div>
          </div>
        </section>

        <section class="side">
          <div class="panel">
            <div class="panelTitle">🧪 Fix Buttons</div>

            <button class="btn" @click="restartIce" :disabled="!pc">♻️ Restart ICE</button>
            <button class="btn" @click="regetMedia">🎥 Re-get Media</button>
            <button class="btn" @click="reconnectSocket">🛰️ Reconnect Socket</button>
            <button class="btn ghost" @click="copyDebug">📋 Copy Debug</button>

            <div class="miniNote">
              If call works on same Wi-Fi but fails on mobile data, you need TURN.
            </div>
          </div>
        </section>
      </main>

      <audio ref="remoteAudio" autoplay></audio>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { createSocket } from "../api/socket";

const route = useRoute();
const router = useRouter();

const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
const token = localStorage.getItem("token");

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "video"); // video | audio

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const localVideo = ref(null);
const remoteVideo = ref(null);
const remoteAudio = ref(null);

const muted = ref(false);
const camOff = ref(false);

const connected = ref(false);
const pcReady = ref(false);
const mediaReady = ref(false);
const iceConnected = ref(false);

const iceState = ref("new");
const connState = ref("new");
const sigState = ref("stable");

const statusText = ref("Starting…");
const errorText = ref("");

let socket = null;
let pc = null;
let localStream = null;
let remoteStream = null;
let makingOffer = false;

/* =========================
   TURN / ICE SERVERS
========================= */
async function getIceServers() {
  // Your server had /api/turn returning { ok, iceServers, note }
  try {
    const res = await fetch(`${apiUrl}/api/turn`);
    const data = await res.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) return data.iceServers;
  } catch {}
  // fallback STUN only
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

/* =========================
   MEDIA
========================= */
async function setupMedia() {
  try {
    errorText.value = "";
    statusText.value = "Requesting camera/mic…";

    const constraints =
      kind === "video"
        ? { video: { facingMode: "user" }, audio: true }
        : { video: false, audio: true };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaReady.value = true;

    if (kind === "video" && localVideo.value) {
      localVideo.value.srcObject = localStream;
    }
  } catch (e) {
    mediaReady.value = false;
    errorText.value = "Camera/Mic blocked. Enable permissions and reload.";
    console.error(e);
    throw e;
  }
}

function attachRemote(stream) {
  if (!stream) return;
  if (kind === "video" && remoteVideo.value) remoteVideo.value.srcObject = stream;
  if (remoteAudio.value) remoteAudio.value.srcObject = stream;
}

/* =========================
   PEER CONNECTION
========================= */
async function createPeer() {
  const iceServers = await getIceServers();

  pc = new RTCPeerConnection({
    iceServers,
    // This helps with Safari/iOS weirdness
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  pcReady.value = true;

  pc.oniceconnectionstatechange = () => {
    iceState.value = pc.iceConnectionState;
    iceConnected.value = ["connected", "completed"].includes(pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    connState.value = pc.connectionState;
  };

  pc.onsignalingstatechange = () => {
    sigState.value = pc.signalingState;
  };

  pc.ontrack = (ev) => {
    if (!remoteStream) remoteStream = new MediaStream();
    remoteStream.addTrack(ev.track);
    attachRemote(remoteStream);
  };

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      emitIce(ev.candidate);
    }
  };

  // add local tracks
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
}

/* =========================
   SOCKET + SIGNALING (MATCHES server call:webrtc:*)
========================= */
function connectSocket() {
  socket = createSocket();

  socket.on("connect", () => {
    connected.value = true;
    statusText.value = "Socket connected. Joining call room…";

    // register presence (safe)
    if (me?.id) {
      const username = me?.username || me?.display_name || me?.email || `User${me.id}`;
      socket.emit("user:online", { userId: String(me.id), username });
      socket.emit("register-user", { id: String(me.id), username });
    }

    // join call room (your server uses a room for signaling)
    socket.emit("call:join", { roomId, role, kind });

    // caller can “start” after join (server may ignore if not needed)
    if (role === "caller") socket.emit("call:start", { roomId, kind });
  });

  socket.on("disconnect", () => {
    connected.value = false;
    statusText.value = "Socket disconnected…";
  });

  /* ====== NEW STYLE EVENTS ====== */
  socket.on("call:webrtc:offer", async ({ sdp }) => {
    await onOffer(sdp);
  });

  socket.on("call:webrtc:answer", async ({ sdp }) => {
    await onAnswer(sdp);
  });

  socket.on("call:webrtc:ice", async ({ candidate }) => {
    await onRemoteIce(candidate);
  });

  socket.on("call:ended", () => {
    statusText.value = "Call ended.";
    cleanup(true);
  });

  socket.on("call:error", ({ message } = {}) => {
    errorText.value = message || "Call error.";
  });

  /* ====== LEGACY FALLBACK EVENTS (so nothing breaks) ====== */
  socket.on("call:offer", async ({ sdp }) => onOffer(sdp));
  socket.on("call:answer", async ({ sdp }) => onAnswer(sdp));
  socket.on("call:ice", async ({ candidate }) => onRemoteIce(candidate));

  // some servers use these:
  socket.on("webrtc:offer", async ({ sdp }) => onOffer(sdp));
  socket.on("webrtc:answer", async ({ sdp }) => onAnswer(sdp));
  socket.on("webrtc:ice", async ({ candidate }) => onRemoteIce(candidate));
}

function emitOffer(sdp) {
  if (!socket) return;
  socket.emit("call:webrtc:offer", { roomId, sdp }); // ✅ expected
  socket.emit("call:offer", { roomId, sdp }); // fallback
}

function emitAnswer(sdp) {
  if (!socket) return;
  socket.emit("call:webrtc:answer", { roomId, sdp });
  socket.emit("call:answer", { roomId, sdp });
}

function emitIce(candidate) {
  if (!socket) return;
  socket.emit("call:webrtc:ice", { roomId, candidate });
  socket.emit("call:ice", { roomId, candidate });
}

/* =========================
   PERFECT NEGOTIATION (fixes “glare”)
========================= */
async function makeOfferIfCaller() {
  if (role !== "caller") return;
  try {
    makingOffer = true;
    statusText.value = "Creating offer…";
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    emitOffer(pc.localDescription);
    statusText.value = "Offer sent…";
  } finally {
    makingOffer = false;
  }
}

async function onOffer(sdp) {
  try {
    if (!pc) return;

    const offerDesc = new RTCSessionDescription(sdp);
    const offerCollision = makingOffer || pc.signalingState !== "stable";

    // If collision, callee rolls back safely
    if (offerCollision) {
      await pc.setLocalDescription({ type: "rollback" });
    }

    await pc.setRemoteDescription(offerDesc);
    statusText.value = "Offer received. Creating answer…";

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitAnswer(pc.localDescription);

    statusText.value = "Answer sent.";
  } catch (e) {
    console.error(e);
    errorText.value = "Failed handling offer.";
  }
}

async function onAnswer(sdp) {
  try {
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    statusText.value = "Connected…";
  } catch (e) {
    console.error(e);
    errorText.value = "Failed handling answer.";
  }
}

async function onRemoteIce(candidate) {
  try {
    if (!pc || !candidate) return;
    await pc.addIceCandidate(candidate);
  } catch (e) {
    // ignore addIceCandidate errors during rollbacks
    console.warn("addIceCandidate warn:", e?.message || e);
  }
}

/* =========================
   ACTIONS
========================= */
function toggleMute() {
  muted.value = !muted.value;
  localStream?.getAudioTracks()?.forEach((t) => (t.enabled = !muted.value));
}

function toggleCam() {
  camOff.value = !camOff.value;
  localStream?.getVideoTracks()?.forEach((t) => (t.enabled = !camOff.value));
}

async function restartIce() {
  try {
    if (!pc) return;
    statusText.value = "Restarting ICE…";
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    emitOffer(pc.localDescription);
  } catch (e) {
    console.error(e);
    errorText.value = "ICE restart failed.";
  }
}

async function regetMedia() {
  try {
    localStream?.getTracks()?.forEach((t) => t.stop());
    await setupMedia();

    // replace tracks on sender
    if (pc) {
      const senders = pc.getSenders();
      const audio = localStream.getAudioTracks()[0];
      const video = localStream.getVideoTracks()[0];

      for (const s of senders) {
        if (s.track?.kind === "audio" && audio) await s.replaceTrack(audio);
        if (s.track?.kind === "video" && video) await s.replaceTrack(video);
      }
    }
    statusText.value = "Media refreshed.";
  } catch (e) {
    console.error(e);
    errorText.value = "Failed to refresh media.";
  }
}

function reconnectSocket() {
  try { socket?.disconnect(); } catch {}
  socket = null;
  connectSocket();
}

async function copyDebug() {
  const debug = {
    roomId,
    role,
    kind,
    apiUrl,
    socketConnected: connected.value,
    iceState: iceState.value,
    connState: connState.value,
    sigState: sigState.value,
    mediaReady: mediaReady.value,
    pcReady: pcReady.value,
  };
  try {
    await navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
    statusText.value = "Debug copied.";
  } catch {
    alert(JSON.stringify(debug, null, 2));
  }
}

function endCall() {
  try { socket?.emit("call:end", { roomId }); } catch {}
  cleanup(true);
}

function goBack() {
  cleanup(true);
  router.back();
}

/* =========================
   CLEANUP
========================= */
function cleanup(navigateAway = false) {
  try { socket?.emit("call:leave", { roomId }); } catch {}
  try { socket?.disconnect(); } catch {}
  socket = null;

  try { pc?.close(); } catch {}
  pc = null;

  try { localStream?.getTracks()?.forEach((t) => t.stop()); } catch {}
  localStream = null;
  remoteStream = null;

  pcReady.value = false;
  iceConnected.value = false;

  if (navigateAway) {
    // no-op
  }
}

/* =========================
   INIT
========================= */
onMounted(async () => {
  if (!roomId) {
    errorText.value = "Missing roomId. Go back and start call again.";
    return;
  }
  if (!token) {
    errorText.value = "Login again to call.";
    return;
  }

  try {
    await setupMedia();
    await createPeer();
    connectSocket();

    // Caller makes the first offer (after short delay to ensure join)
    setTimeout(() => {
      if (role === "caller" && pc) makeOfferIfCaller();
      statusText.value = role === "caller" ? "Calling…" : "Waiting for caller…";
    }, 250);
  } catch (e) {
    console.error(e);
  }
});

onBeforeUnmount(() => {
  cleanup(false);
});
</script>

<style scoped>
.callWrap {
  min-height: 100vh;
  background: #0b1220;
  color: #fff;
  position: relative;
  padding-bottom: 18px;
  overflow: hidden;
}

.bg-animated {
  position: absolute;
  inset: -60px;
  background:
    radial-gradient(900px 600px at 15% 10%, rgba(255,75,43,.20), transparent),
    radial-gradient(900px 600px at 85% 20%, rgba(255,65,108,.18), transparent),
    radial-gradient(900px 600px at 50% 90%, rgba(34,197,94,.12), transparent);
  filter: blur(0px);
  animation: drift 10s ease-in-out infinite;
  z-index: 0;
}
@keyframes drift {
  0% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(10px,-8px,0) scale(1.02); }
  100% { transform: translate3d(0,0,0) scale(1); }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(8,12,20,.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.10);
}

.right { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }

.chip {
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.10);
  color: #fff;
  padding: 10px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
}
.ghost { opacity: .95; }
.danger { background: rgba(255,80,80,.22); border-color: rgba(255,80,80,.35); }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.30);
}
.dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.35); }
.dot.on { background: #00e676; }
.t { font-weight: 950; }
.s { opacity: .8; font-size: 12px; }

.grid {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 14px;
}

.stageInner {
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  overflow: hidden;
  min-height: 520px;
}

.remote {
  width: 100%;
  height: 520px;
  object-fit: cover;
  background: #000;
}
.local {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 160px;
  height: 220px;
  object-fit: cover;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.16);
  background: #000;
}

.hud {
  position: absolute;
  left: 12px;
  bottom: 12px;
  right: 190px;
  display: grid;
  gap: 8px;
}

.hudRow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.small { font-size: 12px; opacity: .85; }
.sep { opacity: .5; }

.badge {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.35);
  font-weight: 950;
  font-size: 12px;
}
.badge.ok { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.12); }

.errorBox, .hintBox {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.35);
}
.errorBox { border-color: rgba(255,80,80,.35); background: rgba(255,80,80,.14); }

.audioOnly {
  height: 520px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
}
.ringIcon { font-size: 44px; }
.ringTitle { font-weight: 950; font-size: 18px; }
.ringSub { opacity: .75; }

.panel {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  padding: 14px;
}
.panelTitle { font-weight: 950; margin-bottom: 10px; }

.btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.35);
  color: #fff;
  cursor: pointer;
  font-weight: 950;
  margin-bottom: 10px;
}
.btn.ghost { opacity: .9; }

.miniNote { opacity: .8; font-size: 12px; margin-top: 6px; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .hud { right: 12px; }
  .local { width: 120px; height: 160px; }
}
</style>