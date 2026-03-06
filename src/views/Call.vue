<template>
  <Layout>
    <div class="callPage">
      <div class="bg" aria-hidden="true"></div>

      <!-- TOP BAR -->
      <header class="top glass">
        <div class="left">
          <button class="chip ghost" @click="goBack">← Back</button>
          <div class="title">
            <div class="t">Pulse Call</div>
            <div class="s">
              <span class="dot" :class="{ on: connected }"></span>
              {{ statusText }}
              <span v-if="hud.rttMs != null" class="pill">RTT {{ hud.rttMs }}ms</span>
              <span v-if="hud.bitrateKbps != null" class="pill">{{ hud.bitrateKbps }} kbps</span>
              <span v-if="hud.packetsLost != null" class="pill">Loss {{ hud.packetsLost }}%</span>
            </div>
          </div>
        </div>

        <div class="right">
          <button class="chip" @click="softReconnect" :disabled="busyReconnect">
            {{ busyReconnect ? "Reconnecting…" : "Reconnect" }}
          </button>
          <button class="chip danger" @click="endCall('user_end')">End</button>
        </div>
      </header>

      <!-- STAGE -->
      <main class="stage">
        <!-- Remote (big) -->
        <section class="remote glass">
          <div class="label">
            <span class="badge">{{ kind === "audio" ? "AUDIO" : "VIDEO" }}</span>
            <span class="name">{{ peerLabel }}</span>
          </div>

          <video
            v-if="kind === 'video'"
            ref="remoteVideo"
            class="remoteVideo"
            autoplay
            playsinline
          ></video>

          <div v-else class="audioOnly">
            <div class="orb"></div>
            <div class="txt">Audio Call</div>
          </div>

          <!-- Remote audio element (always) -->
          <audio ref="remoteAudio" autoplay></audio>

          <div v-if="toast" class="toast glass">{{ toast }}</div>
        </section>

        <!-- Local (picture-in-picture) -->
        <section class="local glass" :class="{ hidden: kind === 'audio' }">
          <video ref="localVideo" class="localVideo" autoplay muted playsinline></video>
          <div class="localTag">
            <span class="dot on"></span> You
          </div>
        </section>

        <!-- CONTROLS -->
        <footer class="controls glass">
          <button class="ctrl" :class="{ active: !micMuted }" @click="toggleMic">
            <span class="ic">{{ micMuted ? "🔇" : "🎙️" }}</span>
            <span class="tx">{{ micMuted ? "Mic Off" : "Mic On" }}</span>
          </button>

          <button class="ctrl" :class="{ active: !camOff }" @click="toggleCam" :disabled="kind==='audio'">
            <span class="ic">{{ camOff ? "📷🚫" : "📷" }}</span>
            <span class="tx">{{ camOff ? "Cam Off" : "Cam On" }}</span>
          </button>

          <button class="ctrl" @click="flipCamera" :disabled="kind==='audio' || !canFlip">
            <span class="ic">🔁</span>
            <span class="tx">Flip</span>
          </button>

          <button class="ctrl" :class="{ active: speakerOn }" @click="toggleSpeaker">
            <span class="ic">{{ speakerOn ? "🔊" : "🔈" }}</span>
            <span class="tx">{{ speakerOn ? "Speaker" : "Earpiece" }}</span>
          </button>

          <button class="ctrl danger" @click="endCall('user_end')">
            <span class="ic">🛑</span>
            <span class="tx">Hang Up</span>
          </button>
        </footer>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "@/components/Layout.vue";

// ✅ Your socket should come from your existing file
// Example: src/services/socket.js exports `socket` already connected with token.
import { socket } from "@/services/socket";

// ✅ API base (for optional TURN endpoint)
const API = import.meta.env.VITE_API_URL || "";

/**
 * ROUTE EXPECTATIONS (works with query OR props style)
 * /call?roomId=abc123&kind=video&peer=User%20%234
 */
const route = useRoute();
const router = useRouter();

const roomId = ref(String(route.query.roomId || ""));
const kind = ref(route.query.kind === "audio" ? "audio" : "video"); // "video" | "audio"
const peerLabel = ref(String(route.query.peer || "Friend"));

/* ---------- STATE ---------- */
const pc = ref(null);
const localStream = ref(null);
const remoteStream = ref(new MediaStream());

const localVideo = ref(null);
const remoteVideo = ref(null);
const remoteAudio = ref(null);

const micMuted = ref(false);
const camOff = ref(false);
const speakerOn = ref(true);
const canFlip = ref(true);

const connected = ref(false);
const toast = ref("");
const busyReconnect = ref(false);

const hud = reactive({
  rttMs: null,
  bitrateKbps: null,
  packetsLost: null,
});

/* ---------- QUALITY / RELIABILITY ---------- */
let keepAliveDc = null;
let keepAliveTimer = null;

let statsTimer = null;
let lastBytes = 0;
let lastTs = 0;

let restartTries = 0;
let restartTimer = null;

const statusText = computed(() => {
  if (!pc.value) return "Starting…";
  const c = pc.value.connectionState;
  const i = pc.value.iceConnectionState;
  if (connected.value) return `Connected • ${c || "ok"} • ICE ${i || "ok"}`;
  return `Connecting… • ${c || "?"} • ICE ${i || "?"}`;
});

function showToast(msg, ms = 1500) {
  toast.value = msg;
  if (ms) setTimeout(() => (toast.value = ""), ms);
}

function goBack() {
  endCall("back_nav");
  router.back();
}

/* ---------- TURN / ICE SERVERS ---------- */
async function getIceServers() {
  // Best: call your backend to fetch TURN each call.
  // Option A: socket request
  // Option B: HTTP request (below)
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/turn`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.iceServers) && data.iceServers.length) return data.iceServers;
    }
  } catch {}

  // Fallback STUN (works but less reliable on mobile)
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
}

/* ---------- MEDIA ---------- */
async function getUserMediaSmart() {
  const baseAudio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (kind.value === "audio") {
    return navigator.mediaDevices.getUserMedia({ audio: baseAudio, video: false });
  }

  // “Clean” default: 720p, 30fps (balanced)
  const video = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
  };

  return navigator.mediaDevices.getUserMedia({ audio: baseAudio, video });
}

async function attachLocal(stream) {
  if (localVideo.value && kind.value === "video") {
    localVideo.value.srcObject = stream;
  }
}

function attachRemote(stream) {
  if (remoteVideo.value && kind.value === "video") remoteVideo.value.srcObject = stream;
  if (remoteAudio.value) remoteAudio.value.srcObject = stream;
}

/* ---------- PEER CONNECTION ---------- */
async function createPeer() {
  const iceServers = await getIceServers();

  const conn = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: "all", // if you want TURN-only stability: "relay"
  });

  // Remote tracks
  conn.ontrack = (ev) => {
    ev.streams[0].getTracks().forEach((t) => remoteStream.value.addTrack(t));
    attachRemote(remoteStream.value);
  };

  // ICE candidates
  conn.onicecandidate = (ev) => {
    if (ev.candidate) {
      socket.emit("call:signal", {
        roomId: roomId.value,
        type: "candidate",
        candidate: ev.candidate,
      });
    }
  };

  // Connection monitoring (DON’T instantly end!)
  conn.onconnectionstatechange = () => {
    const s = conn.connectionState;
    if (s === "connected") {
      connected.value = true;
      restartTries = 0;
      showToast("✅ Connected");
    }
    if (s === "disconnected") {
      connected.value = false;
      showToast("⚠️ Network changed… trying to recover", 2200);
      scheduleIceRestart();
    }
    if (s === "failed") {
      connected.value = false;
      showToast("❌ Network failed… restarting ICE", 2200);
      scheduleIceRestart(true);
    }
  };

  conn.oniceconnectionstatechange = () => {
    const s = conn.iceConnectionState;
    if (s === "disconnected") {
      connected.value = false;
      scheduleIceRestart();
    }
    if (s === "failed") {
      connected.value = false;
      scheduleIceRestart(true);
    }
  };

  // Keepalive data channel (prevents 30–60s NAT drop)
  try {
    keepAliveDc = conn.createDataChannel("ka");
    keepAliveDc.onopen = () => {
      clearInterval(keepAliveTimer);
      keepAliveTimer = setInterval(() => {
        if (keepAliveDc?.readyState === "open") keepAliveDc.send("ping");
      }, 10000);
    };
    keepAliveDc.onclose = () => clearInterval(keepAliveTimer);
  } catch {}

  // If other side creates it:
  conn.ondatachannel = (e) => {
    e.channel.onmessage = () => {}; // ignore pings
  };

  pc.value = conn;
  return conn;
}

async function applySenderQuality(pcConn) {
  // Optional: set bitrate caps for cleaner video (if supported)
  try {
    pcConn.getSenders().forEach((sender) => {
      if (!sender.track) return;
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];

      // Video bitrate (good quality without huge bandwidth)
      if (sender.track.kind === "video") {
        params.encodings[0].maxBitrate = 1_800_000; // 1.8 Mbps
      }
      // Audio bitrate
      if (sender.track.kind === "audio") {
        params.encodings[0].maxBitrate = 64_000; // 64 kbps
      }
      sender.setParameters(params).catch(() => {});
    });
  } catch {}
}

/* ---------- CALL FLOW ---------- */
async function start() {
  if (!roomId.value) {
    showToast("Missing roomId");
    return;
  }

  // Reset
  remoteStream.value = new MediaStream();
  attachRemote(remoteStream.value);

  // Get media
  localStream.value = await getUserMediaSmart();
  await attachLocal(localStream.value);

  // Peer
  const conn = await createPeer();

  // Add tracks
  localStream.value.getTracks().forEach((t) => conn.addTrack(t, localStream.value));

  await applySenderQuality(conn);

  // Join/rejoin room for signaling
  socket.emit("call:rejoin", { roomId: roomId.value });

  // If you are the "caller" you can auto-create offer.
  // If your server already decides roles, you can remove this and only react to offers.
  await makeOffer();
  startStatsLoop();
}

/* ---------- SIGNALING ---------- */
async function makeOffer(opts = {}) {
  const conn = pc.value;
  if (!conn) return;

  const offer = await conn.createOffer({ iceRestart: !!opts.iceRestart });
  await conn.setLocalDescription(offer);

  socket.emit("call:signal", {
    roomId: roomId.value,
    type: "offer",
    sdp: offer.sdp,
    iceRestart: !!opts.iceRestart,
  });
}

async function handleOffer(sdp) {
  const conn = pc.value;
  if (!conn) return;

  await conn.setRemoteDescription({ type: "offer", sdp });
  const ans = await conn.createAnswer();
  await conn.setLocalDescription(ans);

  socket.emit("call:signal", {
    roomId: roomId.value,
    type: "answer",
    sdp: ans.sdp,
  });
}

async function handleAnswer(sdp) {
  const conn = pc.value;
  if (!conn) return;
  await conn.setRemoteDescription({ type: "answer", sdp });
}

async function handleCandidate(candidate) {
  const conn = pc.value;
  if (!conn) return;
  try {
    await conn.addIceCandidate(candidate);
  } catch {
    // ignore (can happen if candidate arrives early)
  }
}

/* ---------- ICE RESTART (THE “DON’T END UNDER 1 MIN” FIX) ---------- */
function scheduleIceRestart(force = false) {
  clearTimeout(restartTimer);

  // Don’t spam
  restartTimer = setTimeout(async () => {
    if (!pc.value) return;

    const state = pc.value.iceConnectionState;
    const cstate = pc.value.connectionState;

    // If already connected again, stop
    if (state === "connected" || cstate === "connected") return;

    if (restartTries >= 2 && !force) return;

    restartTries++;
    showToast(`🔄 Recovering… (ICE restart ${restartTries}/2)`, 2200);
    try {
      await makeOffer({ iceRestart: true });
    } catch {
      // if offer fails, we’ll try soft reconnect
      if (restartTries >= 2) softReconnect();
    }
  }, force ? 600 : 1200);
}

async function softReconnect() {
  if (busyReconnect.value) return;
  busyReconnect.value = true;

  showToast("Reconnecting…", 2200);

  try {
    // Re-join signaling room (socket may have reconnected)
    socket.emit("call:rejoin", { roomId: roomId.value });

    // ICE restart offer
    await makeOffer({ iceRestart: true });
  } finally {
    setTimeout(() => (busyReconnect.value = false), 1200);
  }
}

/* ---------- STATS HUD ---------- */
function startStatsLoop() {
  stopStatsLoop();
  statsTimer = setInterval(async () => {
    if (!pc.value) return;

    try {
      const stats = await pc.value.getStats();
      let rtt = null;
      let bytesNow = null;
      let tsNow = null;
      let lost = null;
      let total = null;

      stats.forEach((r) => {
        if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime != null) {
          rtt = Math.round(r.currentRoundTripTime * 1000);
        }
        if (r.type === "inbound-rtp" && r.kind === "video") {
          if (typeof r.bytesReceived === "number") bytesNow = r.bytesReceived;
          if (typeof r.timestamp === "number") tsNow = r.timestamp;
          if (typeof r.packetsLost === "number") lost = r.packetsLost;
          if (typeof r.packetsReceived === "number") total = r.packetsReceived + (r.packetsLost || 0);
        }
      });

      hud.rttMs = rtt;

      if (bytesNow != null && tsNow != null) {
        if (lastTs && tsNow > lastTs) {
          const dBytes = bytesNow - lastBytes;
          const dSec = (tsNow - lastTs) / 1000;
          const kbps = Math.max(0, Math.round((dBytes * 8) / 1000 / dSec));
          hud.bitrateKbps = kbps;
        }
        lastBytes = bytesNow;
        lastTs = tsNow;
      }

      if (lost != null && total != null && total > 0) {
        hud.packetsLost = Math.min(99, Math.round((lost / total) * 100));
      }
    } catch {}
  }, 1500);
}

function stopStatsLoop() {
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = null;
}

/* ---------- CONTROLS ---------- */
function toggleMic() {
  if (!localStream.value) return;
  micMuted.value = !micMuted.value;
  localStream.value.getAudioTracks().forEach((t) => (t.enabled = !micMuted.value));
}

function toggleCam() {
  if (kind.value === "audio" || !localStream.value) return;
  camOff.value = !camOff.value;
  localStream.value.getVideoTracks().forEach((t) => (t.enabled = !camOff.value));
}

async function flipCamera() {
  if (kind.value === "audio") return;
  if (!navigator.mediaDevices?.getUserMedia) return;

  try {
    const current = localStream.value?.getVideoTracks?.()?.[0];
    if (!current) return;

    const settings = current.getSettings?.() || {};
    const nextFacing = settings.facingMode === "environment" ? "user" : "environment";

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: nextFacing,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
    });

    const newTrack = newStream.getVideoTracks()[0];

    // Replace track on stream
    localStream.value.removeTrack(current);
    current.stop();
    localStream.value.addTrack(newTrack);
    await attachLocal(localStream.value);

    // Replace track on sender
    const sender = pc.value?.getSenders()?.find((s) => s.track && s.track.kind === "video");
    if (sender) await sender.replaceTrack(newTrack);

    showToast("🔁 Camera switched");
  } catch {
    showToast("Flip not supported here", 1800);
    canFlip.value = false;
  }
}

function toggleSpeaker() {
  // On iOS Safari you cannot force audio route reliably.
  // But we keep the UI and ensure remote audio is unmuted/volume.
  speakerOn.value = !speakerOn.value;
  if (remoteAudio.value) remoteAudio.value.volume = speakerOn.value ? 1 : 0.5;
}

/* ---------- CLEANUP ---------- */
function stopTracks(stream) {
  try {
    stream?.getTracks?.()?.forEach((t) => t.stop());
  } catch {}
}

function endCall(reason = "end") {
  try {
    socket.emit("call:end", { roomId: roomId.value, reason });
  } catch {}

  clearInterval(keepAliveTimer);
  keepAliveTimer = null;

  stopStatsLoop();

  try {
    pc.value?.close?.();
  } catch {}
  pc.value = null;

  stopTracks(localStream.value);
  localStream.value = null;

  // clear remote
  try {
    remoteStream.value?.getTracks?.()?.forEach((t) => remoteStream.value.removeTrack(t));
  } catch {}

  connected.value = false;
}

/* ---------- SOCKET EVENTS ---------- */
function bindSocket() {
  // Offer / Answer / Candidate
  socket.on("call:signal", async (msg) => {
    if (!msg || msg.roomId !== roomId.value) return;

    if (msg.type === "offer") return handleOffer(msg.sdp);
    if (msg.type === "answer") return handleAnswer(msg.sdp);
    if (msg.type === "candidate") return handleCandidate(msg.candidate);
  });

  socket.on("call:end", (msg) => {
    if (!msg || msg.roomId !== roomId.value) return;
    showToast("Call ended");
    endCall("remote_end");
    router.push("/dashboard");
  });

  // Reconnect-safe
  socket.on("connect", () => {
    if (!roomId.value) return;
    socket.emit("call:rejoin", { roomId: roomId.value });
    // don’t hard end; try to heal
    scheduleIceRestart();
  });
}

function unbindSocket() {
  socket.off("call:signal");
  socket.off("call:end");
  socket.off("connect");
}

/* ---------- LIFECYCLE ---------- */
onMounted(async () => {
  bindSocket();

  // If page goes background (iPhone), DON’T end—heal when it returns
  document.addEventListener("visibilitychange", onVisChange);

  try {
    await start();
  } catch (e) {
    console.error(e);
    showToast("Could not start call. Check camera/mic permissions.", 2500);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisChange);
  unbindSocket();
  endCall("unmount");
});

function onVisChange() {
  if (document.hidden) {
    showToast("Keep Pulse open during calls for best stability", 2500);
  } else {
    // When returning, attempt recovery
    scheduleIceRestart(true);
  }
}
</script>

<style scoped>
/* ===== Premium “Pulse” call page ===== */
.callPage { position: relative; min-height: 100vh; padding: 16px; color: #e9ecff; }
.bg{
  position: fixed; inset: 0;
  background:
    radial-gradient(1200px 600px at 20% 10%, rgba(255,60,120,.18), transparent 60%),
    radial-gradient(900px 500px at 80% 30%, rgba(120,80,255,.18), transparent 55%),
    radial-gradient(800px 600px at 50% 90%, rgba(0,255,200,.10), transparent 55%),
    linear-gradient(180deg, #0b1220, #070a12);
  filter: saturate(1.2);
  z-index: -1;
}

/* ✅ Your requested glass */
.glass{
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px rgba(255,255,255,0.08);
  border-radius: 18px;
}

.top{
  display:flex; align-items:center; justify-content:space-between;
  padding: 12px 12px; gap: 12px;
}
.left{ display:flex; align-items:center; gap: 12px; }
.title .t{ font-weight: 800; letter-spacing: .2px; }
.title .s{ opacity:.9; font-size: 12px; display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }

.dot{ width:10px; height:10px; border-radius: 99px; background: rgba(255,255,255,.25); display:inline-block; }
.dot.on{ background: #20f09a; box-shadow: 0 0 16px rgba(32,240,154,.55); }

.pill{
  padding: 4px 8px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
}

.right{ display:flex; align-items:center; gap: 10px; }

.chip{
  padding: 10px 12px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  color:#eef1ff; cursor:pointer;
}
.chip.ghost{ background: rgba(255,255,255,.06); }
.chip.danger{ background: rgba(255,70,100,.20); border-color: rgba(255,70,100,.35); }
.chip:disabled{ opacity:.55; cursor:not-allowed; }

.stage{ margin-top: 14px; display:grid; gap: 14px; }

.remote{
  position: relative;
  min-height: 52vh;
  overflow:hidden;
  padding: 12px;
}
.remoteVideo{
  width:100%; height: 52vh;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(0,0,0,.45);
}
.label{
  position:absolute; top: 12px; left: 12px;
  display:flex; gap: 10px; align-items:center;
  z-index: 2;
}
.badge{
  padding: 6px 10px; border-radius: 999px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 12px; font-weight: 800;
}
.name{ font-weight: 800; text-shadow: 0 6px 20px rgba(0,0,0,.45); }

.toast{
  position:absolute; left: 12px; bottom: 12px;
  padding: 10px 12px; font-weight: 700;
}

.audioOnly{
  height: 52vh;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 12px;
}
.orb{
  width: 110px; height: 110px; border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255,80,140,.55), rgba(120,80,255,.22), rgba(0,0,0,.25));
  box-shadow: 0 0 40px rgba(255,80,140,.18);
}
.audioOnly .txt{ opacity:.9; font-weight: 800; }

.local{
  position: fixed;
  right: 18px; bottom: 110px;
  width: 140px; height: 200px;
  padding: 8px;
  z-index: 20;
}
.local.hidden{ display:none; }
.localVideo{
  width:100%; height: 100%;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(0,0,0,.45);
}
.localTag{
  position:absolute; left: 12px; top: 12px;
  padding: 6px 10px; border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  display:flex; gap: 8px; align-items:center;
}

.controls{
  position: sticky; bottom: 12px;
  padding: 10px;
  display:grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.ctrl{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap: 6px;
  padding: 12px 10px;
  border-radius: 14px;
  cursor:pointer;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  color: #eef1ff;
}
.ctrl .ic{ font-size: 18px; }
.ctrl .tx{ font-size: 12px; opacity:.95; font-weight: 800; }
.ctrl.active{ border-color: rgba(32,240,154,.35); box-shadow: 0 0 22px rgba(32,240,154,.10); }
.ctrl.danger{ border-color: rgba(255,70,100,.35); background: rgba(255,70,100,.12); }

@media (max-width: 840px) {
  .controls{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .local{ width: 120px; height: 170px; bottom: 120px; }
}
</style>