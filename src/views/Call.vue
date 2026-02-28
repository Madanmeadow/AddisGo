<template>
  <div class="callPage">
    <!-- TOP BAR -->
    <header class="topBar">
      <div class="who">
        <div class="name">
          {{ displayName }}
          <span class="pill">{{ kindLabel }}</span>
        </div>
        <div class="sub">
          <span class="dot" :class="{ on: connected }"></span>
          <span>{{ statusText }}</span>
          <span class="sep">•</span>
          <span class="timer">{{ callTime }}</span>
        </div>
      </div>

      <button class="miniBtn ghost" @click="toggleStats">
        {{ showStats ? "Hide" : "Stats" }}
      </button>
    </header>

    <!-- STAGE -->
    <main class="stage">
      <div class="frame" :class="{ audioOnly: isAudioOnly }">
        <div class="frameBorder"></div>

        <!-- ✅ REMOTE AUDIO ALWAYS (fixes audio-only calls) -->
        <audio ref="remoteAudio" autoplay playsinline></audio>

        <!-- REMOTE VIDEO -->
        <video
          v-show="!isAudioOnly"
          ref="remoteVideo"
          class="remote"
          autoplay
          playsinline
        ></video>

        <!-- AUDIO-ONLY / AVATAR -->
        <div v-if="isAudioOnly" class="audioCard">
          <div class="avatar">{{ remoteInitial }}</div>
          <div class="audioText">
            <div class="big">{{ displayName }}</div>
            <div class="small">{{ connected ? "Connected" : "Ringing…" }}</div>
          </div>
        </div>

        <!-- LOCAL PIP (DRAGGABLE) -->
        <div
          class="pip"
          v-show="!isAudioOnly"
          :style="{ transform: `translate(${pip.x}px, ${pip.y}px)` }"
          @pointerdown="pipPointerDown"
        >
          <video ref="localVideo" class="local" autoplay playsinline muted></video>

          <div class="pipBadge">
            <span class="tinyDot" :class="{ off: micMuted }"></span>
            <span>{{ micMuted ? "Muted" : "Live" }}</span>
          </div>
        </div>

        <!-- STATUS OVERLAY -->
        <div class="overlay" v-if="!connected">
          <div class="overlayTitle">{{ statusText }}</div>
          <div class="overlaySub">Room: {{ roomId }}</div>

          <button v-if="needsTapToStart" class="btnPrimary" @click="userTapStart">
            Tap to start audio/video
          </button>
        </div>
      </div>

      <!-- STATS -->
      <section v-if="showStats" class="stats">
        <div class="stRow"><span>Peers</span><b>{{ peerCount }}</b></div>
        <div class="stRow"><span>ICE</span><b>{{ iceState }}</b></div>
        <div class="stRow"><span>Conn</span><b>{{ connState }}</b></div>
        <div class="stRow"><span>Mic</span><b>{{ micMuted ? "Muted" : "On" }}</b></div>
        <div class="stRow"><span>Cam</span><b>{{ camOff ? "Off" : "On" }}</b></div>
        <div class="stRow"><span>Speaker</span><b>{{ speakerOn ? "On" : "Off" }}</b></div>
      </section>
    </main>

    <!-- CONTROLS -->
    <footer class="controls">
      <button class="ctl" :class="{ on: !micMuted }" @click="toggleMic" title="Mic">
        <span class="ic">🎙️</span>
        <span class="tx">{{ micMuted ? "Unmute" : "Mute" }}</span>
      </button>

      <button class="ctl" :class="{ on: !camOff }" @click="toggleCamera" title="Camera" :disabled="isAudioOnly">
        <span class="ic">🎥</span>
        <span class="tx">{{ camOff ? "Cam On" : "Cam Off" }}</span>
      </button>

      <button class="ctl" :class="{ on: speakerOn }" @click="toggleSpeaker" title="Speaker">
        <span class="ic">🔊</span>
        <span class="tx">{{ speakerOn ? "Speaker" : "Earpiece" }}</span>
      </button>

      <button class="end" @click="endCall" title="End">
        ⛔ End
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { io } from "socket.io-client";

const route = useRoute();
const router = useRouter();

const apiUrl = import.meta.env.VITE_API_URL;
const me = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();

const roomId = String(route.query.roomId || "");
const role = String(route.query.role || "caller"); // caller | callee
const kind = String(route.query.kind || "video");  // video | audio

const isAudioOnly = computed(() => kind !== "video");

const remoteVideo = ref(null);
const remoteAudio = ref(null);
const localVideo = ref(null);

const socket = ref(null);
const connected = ref(false);
const statusText = ref(role === "caller" ? "Connecting…" : "Joining…");

const showStats = ref(false);
const peerCount = ref(0);
const iceState = ref("-");
const connState = ref("-");
const needsTapToStart = ref(false);

const micMuted = ref(false);
const camOff = ref(false);
const speakerOn = ref(true);

const displayName = computed(() => {
  // later you can pass real name in query or fetch it
  return role === "caller" ? "Call" : "Incoming Call";
});
const remoteInitial = computed(() => (displayName.value?.[0] || "U").toUpperCase());
const kindLabel = computed(() => (isAudioOnly.value ? "AUDIO" : "VIDEO"));

/* ---------------- TIMER ---------------- */
const seconds = ref(0);
let timerInt = null;
const callTime = computed(() => {
  const s = seconds.value;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
});
function startTimer() {
  if (timerInt) return;
  timerInt = setInterval(() => (seconds.value += 1), 1000);
}
function stopTimer() {
  if (timerInt) clearInterval(timerInt);
  timerInt = null;
}

/* ---------------- iOS AUDIO UNLOCK ---------------- */
let audioCtx = null;
async function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== "running") await audioCtx.resume();
  } catch {}
}

/* ---------------- WEBRTC (mesh) ---------------- */
let localStream = null;
let remoteStream = null;

const pcs = new Map(); // peerSocketId -> RTCPeerConnection

async function getIceServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`);
    const data = await res.json();

    if (data?.iceServers?.length) {
      return data.iceServers;
    }
  } catch (e) {
    console.error("ICE fetch failed, fallback to STUN", e);
  }

  return [{ urls: "stun:stun.l.google.com:19302" }];
}

async function ensureLocalStream() {
  if (localStream) return localStream;

  const constraints = isAudioOnly.value
    ? { audio: true, video: false }
    : { audio: true, video: { facingMode: "user" } };

  localStream = await navigator.mediaDevices.getUserMedia(constraints);

  // local preview (video mode only)
  if (!isAudioOnly.value && localVideo.value) {
    localVideo.value.srcObject = localStream;
    try { await localVideo.value.play(); }
    catch { needsTapToStart.value = true; }
  }

  applyMicState();
  applyCamState();

  return localStream;
}

function attachRemoteStream(stream) {
  remoteStream = stream;

  // ✅ Always attach audio (even in video mode)
  if (remoteAudio.value) {
    remoteAudio.value.srcObject = stream;
    remoteAudio.value.muted = !speakerOn.value;
    remoteAudio.value.volume = speakerOn.value ? 1 : 0;
    remoteAudio.value.play?.().catch(() => { needsTapToStart.value = true; });
  }

  // Attach video if this is a video call
  if (remoteVideo.value && !isAudioOnly.value) {
    remoteVideo.value.srcObject = stream;
    remoteVideo.value.muted = !speakerOn.value; // optional (some prefer video not muted)
    remoteVideo.value.volume = speakerOn.value ? 1 : 0;
    remoteVideo.value.play?.().catch(() => { needsTapToStart.value = true; });
  }
}

function createPC(peerId, iceServers) {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      socket.value?.emit("call:webrtc:ice", { roomId, candidate: ev.candidate, to: peerId });
    }
  };

  pc.onconnectionstatechange = () => {
    connState.value = pc.connectionState || "-";
    if (pc.connectionState === "connected") {
      connected.value = true;
      statusText.value = "Connected";
      startTimer();
    }
  };

  pc.oniceconnectionstatechange = () => {
    iceState.value = pc.iceConnectionState || "-";
  };

  pc.ontrack = (ev) => {
    const [stream] = ev.streams;
    if (stream) attachRemoteStream(stream);
  };

  pcs.set(peerId, pc);
  peerCount.value = pcs.size;
  return pc;
}

async function addLocalTracks(pc) {
  const s = await ensureLocalStream();
  s.getTracks().forEach((t) => pc.addTrack(t, s));
}

async function makeOfferTo(peerId) {
  const iceServers = await getIceServers();
  const pc = pcs.get(peerId) || createPC(peerId, iceServers);

  await addLocalTracks(pc);

  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: !isAudioOnly.value });
  await pc.setLocalDescription(offer);

  socket.value?.emit("call:webrtc:offer", { roomId, offer, to: peerId });
}

async function handleOffer(fromPeerId, offer) {
  const iceServers = await getIceServers();
  const pc = pcs.get(fromPeerId) || createPC(fromPeerId, iceServers);

  await addLocalTracks(pc);

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.value?.emit("call:webrtc:answer", { roomId, answer, to: fromPeerId });
}

async function handleAnswer(fromPeerId, answer) {
  const pc = pcs.get(fromPeerId);
  if (!pc) return;
  await pc.setRemoteDescription(answer);
}

async function handleIce(fromPeerId, candidate) {
  const pc = pcs.get(fromPeerId);
  if (!pc) return;
  try { await pc.addIceCandidate(candidate); } catch {}
}

function closeAllPCs() {
  for (const pc of pcs.values()) {
    try { pc.close(); } catch {}
  }
  pcs.clear();
  peerCount.value = 0;
}

/* ---------------- CONTROLS ---------------- */
function applyMicState() {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !micMuted.value));
}
function applyCamState() {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((t) => (t.enabled = !camOff.value));
}

function toggleMic() {
  micMuted.value = !micMuted.value;
  applyMicState();
}

function toggleCamera() {
  camOff.value = !camOff.value;
  applyCamState();
}

async function toggleSpeaker() {
  speakerOn.value = !speakerOn.value;

  // best effort: mute/unmute remote elements
  try {
    if (remoteAudio.value) {
      remoteAudio.value.muted = !speakerOn.value;
      remoteAudio.value.volume = speakerOn.value ? 1 : 0;
    }
    if (remoteVideo.value) {
      remoteVideo.value.muted = !speakerOn.value;
      remoteVideo.value.volume = speakerOn.value ? 1 : 0;
    }
  } catch {}
}

function toggleStats() {
  showStats.value = !showStats.value;
}

async function userTapStart() {
  needsTapToStart.value = false;
  await unlockAudio();

  try { await ensureLocalStream(); } catch {}
  try { await remoteAudio.value?.play?.(); } catch {}
  try { await remoteVideo.value?.play?.(); } catch {}
  try { await localVideo.value?.play?.(); } catch {}
}

function endCall() {
  socket.value?.emit("call:end", { roomId });
  cleanup({ navigate: true });
}

/* ---------------- PIP DRAG ---------------- */
const pip = ref({ x: 0, y: 0 });
let pipDrag = null;

function pipPointerDown(e) {
  // only drag on pointer devices
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  pipDrag = {
    startX: e.clientX,
    startY: e.clientY,
    baseX: pip.value.x,
    baseY: pip.value.y,
  };
  window.addEventListener("pointermove", pipPointerMove);
  window.addEventListener("pointerup", pipPointerUp, { once: true });
}

function pipPointerMove(e) {
  if (!pipDrag) return;
  const dx = e.clientX - pipDrag.startX;
  const dy = e.clientY - pipDrag.startY;
  pip.value = { x: pipDrag.baseX + dx, y: pipDrag.baseY + dy };
}

function pipPointerUp() {
  pipDrag = null;
  window.removeEventListener("pointermove", pipPointerMove);
}

/* ---------------- CLEANUP ---------------- */
let cleaning = false;
function cleanup({ navigate } = { navigate: false }) {
  if (cleaning) return;
  cleaning = true;

  stopTimer();
  closeAllPCs();

  try { socket.value?.emit("call:leave", { roomId }); } catch {}
  try { socket.value?.disconnect?.(); } catch {}
  socket.value = null;

  try {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
  } catch {}

  // do NOT force route change on unmount
  if (navigate) router.push("/dashboard");
}

/* ---------------- INIT ---------------- */
onMounted(async () => {
  if (!roomId) {
    alert("Missing roomId");
    router.push("/dashboard");
    return;
  }

  // unlock attempt on first user interaction anywhere
  window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });

  socket.value = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.value.on("connect", async () => {
    if (me?.id) socket.value.emit("register-user", { id: me.id, username: me.username });

    socket.value.emit("call:join", { roomId });
    statusText.value = "Joining…";

    try { await ensureLocalStream(); }
    catch { /* permission can fail; still allow listening */ }
  });

  socket.value.on("call:peer-joined", async ({ peerSocketId }) => {
    if (!peerSocketId) return;
    statusText.value = "Peer joined… negotiating";
    await makeOfferTo(peerSocketId);
  });

  socket.value.on("call:ready", () => {
    // call is ready for negotiation
    if (!connected.value) statusText.value = "Connecting…";
  });

  socket.value.on("call:webrtc:offer", async ({ offer, from }) => {
    if (!from || !offer) return;
    await handleOffer(from, offer);
  });

  socket.value.on("call:webrtc:answer", async ({ answer, from }) => {
    if (!from || !answer) return;
    await handleAnswer(from, answer);
  });

  socket.value.on("call:webrtc:ice", async ({ candidate, from }) => {
    if (!from || !candidate) return;
    await handleIce(from, candidate);
  });

  socket.value.on("call:ended", () => {
    cleanup({ navigate: true });
  });

  socket.value.on("call:error", ({ message } = {}) => {
    alert(message || "Call error");
    cleanup({ navigate: true });
  });
});

onBeforeUnmount(() => {
  // no navigation on destroy
  cleanup({ navigate: false });
});
</script>

<style scoped>
.callPage{
  min-height: 100vh;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.18), transparent),
    radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.16), transparent),
    #070b14;
  color: #fff;
  display:flex;
  flex-direction: column;
}

/* Top bar */
.topBar{
  position: sticky;
  top:0;
  z-index: 20;
  padding: 14px 14px;
  display:flex;
  align-items:center;
  justify-content: space-between;
  background: rgba(8, 12, 20, 0.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.10);
}
.who .name{ font-weight: 950; font-size: 16px; display:flex; align-items:center; gap:10px; }
.pill{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 900;
}
.sub{ margin-top: 4px; opacity: .85; font-size: 12px; display:flex; align-items:center; gap:8px; }
.sep{ opacity:.5; }
.timer{ font-variant-numeric: tabular-nums; }

.dot{
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(255,255,255,0.30);
}
.dot.on{ background: #00e676; box-shadow: 0 0 12px rgba(0,230,118,0.5); }

.miniBtn{
  border:none;
  cursor:pointer;
  padding: 10px 12px;
  border-radius: 999px;
  color:#fff;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
}
.miniBtn.ghost{ opacity:.92; }

/* Stage */
.stage{
  flex:1;
  display:grid;
  place-items:center;
  padding: 18px 14px 0;
}

.frame{
  width: min(980px, 96vw);
  aspect-ratio: 16 / 9;
  border-radius: 26px;
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
}

/* Animated gradient border */
.frameBorder{
  position:absolute;
  inset:-2px;
  border-radius: 28px;
  background: conic-gradient(from 180deg,
    #ff416c, #ff4b2b, #7c3aed, #22c55e, #ff416c);
  filter: blur(10px);
  opacity: .55;
  animation: spin 4s linear infinite;
  pointer-events:none;
}
@keyframes spin { to { transform: rotate(360deg); } }

.remote{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
}

.pip{
  position:absolute;
  right: 14px;
  bottom: 14px;
  width: clamp(140px, 22vw, 280px);
  aspect-ratio: 16 / 10;
  border-radius: 18px;
  overflow:hidden;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 14px 40px rgba(0,0,0,0.45);
  touch-action: none;
  user-select: none;
  cursor: grab;
}
.pip:active{ cursor: grabbing; }

.local{
  width:100%;
  height:100%;
  object-fit: cover;
}
.pipBadge{
  position:absolute;
  left: 10px;
  top: 10px;
  display:flex;
  align-items:center;
  gap:8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 900;
  font-size: 12px;
}
.tinyDot{
  width:10px; height:10px; border-radius:50%;
  background:#00e676;
}
.tinyDot.off{ background: rgba(255,255,255,0.35); }

/* Audio-only card */
.audioOnly{
  aspect-ratio: 16 / 9;
}
.audioCard{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  gap: 14px;
  text-align:center;
}
.avatar{
  width: 120px; height: 120px;
  border-radius: 34px;
  display:grid;
  place-items:center;
  font-size: 54px;
  font-weight: 950;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 0 40px rgba(255,75,43,0.18);
}
.audioText .big{ font-weight: 950; font-size: 22px; }
.audioText .small{ opacity:.75; margin-top: 6px; }

/* Overlay (connecting) */
.overlay{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  text-align:center;
  gap: 10px;
  background: rgba(0,0,0,0.25);
}
.overlayTitle{ font-size: 22px; font-weight: 950; }
.overlaySub{ opacity:.75; font-size: 12px; }
.btnPrimary{
  border:none;
  cursor:pointer;
  padding: 12px 14px;
  border-radius: 999px;
  color:#fff;
  font-weight: 950;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}

/* Stats panel */
.stats{
  width: min(980px, 96vw);
  margin-top: 12px;
  border-radius: 18px;
  padding: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  display:grid;
  gap: 8px;
}
.stRow{ display:flex; align-items:center; justify-content:space-between; opacity:.95; }
.stRow span{ opacity:.75; }
.stRow b{ font-variant-numeric: tabular-nums; }

/* Controls */
.controls{
  padding: 12px 12px calc(16px + env(safe-area-inset-bottom));
  display:flex;
  gap: 10px;
  justify-content: center;
  background: rgba(8, 12, 20, 0.72);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.10);
}
.ctl{
  border:none;
  cursor:pointer;
  padding: 12px 14px;
  border-radius: 18px;
  color:#fff;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
  display:flex;
  flex-direction: column;
  align-items:center;
  gap: 6px;
  min-width: 92px;
  transition: transform .12s ease;
}
.ctl:hover{ transform: translateY(-2px); }
.ctl:disabled{ opacity:.45; cursor:not-allowed; transform:none; }
.ctl.on{
  background: rgba(255,75,43,0.16);
  border-color: rgba(255,75,43,0.35);
  box-shadow: 0 0 24px rgba(255,75,43,0.18);
}
.ic{ font-size: 20px; }
.tx{ font-weight: 900; font-size: 12px; opacity:.92; }

.end{
  border:none;
  cursor:pointer;
  padding: 12px 18px;
  border-radius: 18px;
  font-weight: 950;
  color:#fff;
  background: rgba(255, 60, 60, 0.22);
  border: 1px solid rgba(255, 80, 80, 0.45);
  min-width: 120px;
  box-shadow: 0 0 30px rgba(255,60,60,0.18);
}

@media (max-width: 720px){
  .frame{ aspect-ratio: 9 / 16; }
  .pip{ width: 34vw; }
  .ctl{ min-width: 86px; }
}
</style>