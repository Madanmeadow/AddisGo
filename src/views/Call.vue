<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="titleBlock">
          <div class="titleRow">
            <div class="title">AddisGo Call</div>
            <span class="badge" :class="kind === 'video' ? 'video' : 'audio'">{{ kind.toUpperCase() }}</span>
            <span class="badge live" v-if="connected">CONNECTED</span>
            <span class="badge ended" v-if="ended">ENDED</span>
          </div>

          <div class="metaRow">
            <span>Room: <b class="mono">{{ roomId || "—" }}</b></span>
            <span class="dot">•</span>
            <span>Time: <b class="mono">{{ callTime }}</b></span>
            <span class="dot">•</span>
            <span>ICE: <b>{{ iceMode }}</b></span>
            <span class="dot">•</span>
            <span>Peers: <b class="mono">{{ peerCount }}</b></span>
            <span class="dot">•</span>
            <span>Socket: <b>{{ socketState }}</b></span>
          </div>
        </div>

        <div class="rightBtns">
          <button class="chip" @click="showDevices = !showDevices">🎛 Devices</button>
          <button class="chip" @click="togglePanel">{{ panelOpen ? "Hide Tips" : "Show Tips" }}</button>
          <button class="chip danger" @click="endCall" :disabled="busy">End Call</button>
        </div>
      </header>

      <!-- Device Drawer -->
      <div v-if="showDevices" class="card deviceCard">
        <div class="deviceTitle">Devices</div>

        <div class="deviceGrid">
          <label class="field">
            <span>Microphone</span>
            <select v-model="selectedMic" @change="applyDevices">
              <option value="">Default</option>
              <option v-for="d in mics" :key="d.deviceId" :value="d.deviceId">{{ d.label || "Mic" }}</option>
            </select>
          </label>

          <label class="field" v-if="kind === 'video'">
            <span>Camera</span>
            <select v-model="selectedCam" @change="applyDevices">
              <option value="">Default</option>
              <option v-for="d in cams" :key="d.deviceId" :value="d.deviceId">{{ d.label || "Camera" }}</option>
            </select>
          </label>

          <label class="field">
            <span>Speaker</span>
            <select v-model="selectedSpk" @change="applySpeakerToAll">
              <option value="">Default</option>
              <option v-for="d in speakers" :key="d.deviceId" :value="d.deviceId">{{ d.label || "Speaker" }}</option>
            </select>
            <small class="mini">Speaker selection works on Chrome/Edge desktop (setSinkId).</small>
          </label>
        </div>

        <div class="deviceActions">
          <button class="btn ghost" @click="refreshDevices">Refresh list</button>
          <button class="btn primary" @click="showDevices = false">Done</button>
        </div>
      </div>

      <section class="grid">
        <!-- LEFT: MEDIA -->
        <div class="card mediaCard">
          <div class="mediaTop">
            <div class="small muted">
              Role: <b>{{ role }}</b>
              <span class="dot">•</span>
              Presence: <b>{{ presenceCount }}</b>
              <span class="dot">•</span>
              Stats: <b class="mono">{{ statsLine }}</b>
            </div>

            <div class="mediaBtns">
              <button class="btn ghost" @click="enableSoundOnce">🔊 Enable Sound</button>
              <button class="btn ghost" @click="toggleMic" :disabled="!localStream">
                {{ micOn ? "Mute" : "Unmute" }}
              </button>

              <button v-if="kind === 'video'" class="btn ghost" @click="toggleCam" :disabled="!localStream">
                {{ camOn ? "Cam Off" : "Cam On" }}
              </button>

              <button v-if="kind === 'video'" class="btn ghost" @click="toggleScreen" :disabled="busy">
                {{ screenOn ? "Stop Share" : "Share Screen" }}
              </button>

              <button v-if="kind === 'video'" class="btn ghost" @click="flipCamera" :disabled="busy">
                🔄 Flip Cam
              </button>

              <button class="btn primary" @click="reconnect" :disabled="busy">Reconnect</button>
            </div>
          </div>

          <div class="mediaGrid" :class="kind === 'video' ? 'videoGrid' : 'audioGrid'">
            <!-- Local -->
            <div class="tile">
              <div class="label">You</div>

              <video v-if="kind === 'video'" ref="localVideo" class="video" autoplay muted playsinline />
              <div v-else class="avatar">
                🎙️
                <div class="hintSmall">Audio call</div>
              </div>
            </div>

            <!-- Remote tiles -->
            <div v-for="r in remoteList" :key="r.id" class="tile">
              <div class="label">Remote</div>

              <video v-if="kind === 'video'" :ref="setRemoteVideoRef(r.id)" class="video" autoplay playsinline />
              <div v-else class="avatar">
                👤
                <div class="hintSmall">Connected</div>
              </div>

              <audio :ref="setRemoteAudioRef(r.id)" autoplay />
            </div>
          </div>

          <div class="statusBar">
            <div class="status" :class="connected ? 'ok' : 'warn'">
              {{ connected ? "✅ Call connected" : "⚠️ Waiting for peer…" }}
            </div>
            <div class="hint">
              iPhone/iPad: tap “Enable Sound” once. If network is strict, TURN (Twilio) helps a lot.
            </div>
          </div>
        </div>

        <!-- RIGHT: TIPS -->
        <aside v-if="panelOpen" class="card sideCard">
          <div class="sideTitle">Tips</div>
          <ul class="list">
            <li>Keep screen awake (low power mode can pause audio).</li>
            <li>On iPhone/iPad, tap <b>Enable Sound</b> once.</li>
            <li>Try <b>Reconnect</b> if stuck.</li>
            <li>TURN improves success rate on some networks.</li>
          </ul>

          <div class="divider"></div>

          <div class="kv">
            <div class="k">RoomId</div>
            <div class="v mono">{{ roomId || "—" }}</div>

            <div class="k">Kind</div>
            <div class="v">{{ kind }}</div>

            <div class="k">My User</div>
            <div class="v mono">{{ me?.id || "—" }}</div>

            <div class="k">Peers</div>
            <div class="v mono">{{ peerCount }}</div>
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

const roomId = ref(String(route.query.roomId || ""));
const kind = ref(route.query.kind === "video" ? "video" : "audio");
const role = ref(String(route.query.role || "member"));

const panelOpen = ref(true);
const busy = ref(false);
const ended = ref(false);
const socketState = ref("connecting");
const presenceCount = ref(0);

const localVideo = ref(null);
let localStream = null;
const micOn = ref(true);
const camOn = ref(true);

const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s => String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:"));
  return hasTurn ? "STUN+TURN" : "STUN only";
});

const peers = new Map();           // peerSocketId -> RTCPeerConnection
const remoteStreams = new Map();   // peerSocketId -> MediaStream
const remoteList = ref([]);        // [{id}]
const peerCount = computed(() => peers.size);
const connected = computed(() => remoteList.value.length > 0 && !ended.value);

// Remote element refs
const remoteVideoEls = new Map();
const remoteAudioEls = new Map();
function setRemoteVideoRef(peerId) {
  return (el) => {
    if (!el) return;
    remoteVideoEls.set(peerId, el);
    const s = remoteStreams.get(peerId);
    if (s) el.srcObject = s;
  };
}
function setRemoteAudioRef(peerId) {
  return (el) => {
    if (!el) return;
    remoteAudioEls.set(peerId, el);
    const s = remoteStreams.get(peerId);
    if (s) el.srcObject = s;
  };
}

// Socket
const socket = io(apiUrl, {
  transports: ["websocket", "polling"],
  auth: token ? { token } : undefined,
});

// Timer
const startAt = ref(Date.now());
const callTime = computed(() => {
  const ms = ended.value ? 0 : Date.now() - startAt.value;
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
});
let timerInt = null;

// Stats
const statsLine = ref("—");
let statsInt = null;
async function pollStats() {
  try {
    let rtt = null;
    let outKbps = 0;

    for (const pc of peers.values()) {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded" && report.currentRoundTripTime != null) {
          rtt = Math.round(report.currentRoundTripTime * 1000);
        }
        if (report.type === "outbound-rtp" && !report.isRemote && report.bytesSent != null) {
          // simple display only (not exact kbps)
          outKbps = Math.max(outKbps, Math.round((report.bytesSent / 1024)));
        }
      });
    }
    statsLine.value = `rtt ${rtt ?? "—"}ms • out ${outKbps}KB`;
  } catch {
    // ignore
  }
}

function togglePanel() { panelOpen.value = !panelOpen.value; }

// iOS autoplay helper + fallback “beep”
async function enableSoundOnce() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.001;
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 120);
  } catch {}
}

async function loadIceServers() {
  try {
    // prefer /ice (clean)
    const r = await fetch(`${apiUrl}/ice`);
    const data = await r.json();
    if (Array.isArray(data?.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
      return;
    }
  } catch {}

  // fallback to /api/turn
  try {
    const r2 = await fetch(`${apiUrl}/api/turn`);
    const data2 = await r2.json();
    if (data2?.ok && Array.isArray(data2.iceServers) && data2.iceServers.length) {
      iceServers.value = data2.iceServers;
    }
  } catch {}
}

// Devices
const showDevices = ref(false);
const mics = ref([]);
const cams = ref([]);
const speakers = ref([]);
const selectedMic = ref("");
const selectedCam = ref("");
const selectedSpk = ref("");

async function refreshDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    mics.value = devices.filter(d => d.kind === "audioinput");
    cams.value = devices.filter(d => d.kind === "videoinput");
    speakers.value = devices.filter(d => d.kind === "audiooutput");
  } catch {}
}

async function startLocalMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: selectedMic.value ? { deviceId: { exact: selectedMic.value } } : true,
    video: kind.value === "video"
      ? (selectedCam.value ? { deviceId: { exact: selectedCam.value }, width: 1280, height: 720 } : { width: 1280, height: 720 })
      : false,
  });

  micOn.value = true;
  camOn.value = true;

  if (kind.value === "video" && localVideo.value) {
    localVideo.value.srcObject = localStream;
  }
}

function stopLocalMedia() {
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

// Screen share (video only)
const screenOn = ref(false);
let screenTrack = null;

async function toggleScreen() {
  if (kind.value !== "video") return;
  if (!localStream) return;

  if (!screenOn.value) {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenTrack = ss.getVideoTracks()[0];
      if (!screenTrack) return;

      screenOn.value = true;

      // replace outgoing video track in all peer connections
      for (const pc of peers.values()) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
      }

      // update local preview
      if (localVideo.value) {
        const preview = new MediaStream([screenTrack, ...localStream.getAudioTracks()]);
        localVideo.value.srcObject = preview;
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch {}
  } else {
    stopScreenShare();
  }
}

async function stopScreenShare() {
  if (!screenTrack) return;
  try { screenTrack.stop(); } catch {}
  screenTrack = null;
  screenOn.value = false;

  // restore camera track if exists
  const camTrack = localStream?.getVideoTracks?.()[0];
  if (camTrack) {
    for (const pc of peers.values()) {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
      if (sender) await sender.replaceTrack(camTrack);
    }
    if (localVideo.value) localVideo.value.srcObject = localStream;
  }
}

// Flip camera (mobile)
async function flipCamera() {
  if (kind.value !== "video") return;
  busy.value = true;
  try {
    const current = selectedCam.value;
    await refreshDevices();
    if (!cams.value.length) return;

    const idx = cams.value.findIndex(c => c.deviceId === current);
    const next = cams.value[(idx + 1) % cams.value.length];
    selectedCam.value = next?.deviceId || "";

    // restart local media (safe)
    closeAllPeers(false);
    stopLocalMedia();
    await startLocalMedia();
    // re-add tracks to peers + renegotiate
    for (const id of remoteList.value.map(r => r.id)) {
      await makeOfferTo(id);
    }
  } finally {
    busy.value = false;
  }
}

async function applyDevices() {
  // safest: reconnect flow
  await reconnect();
}

// Speaker selection (desktop)
async function applySpeakerToAll() {
  try {
    const sinkId = selectedSpk.value || "";
    for (const el of remoteAudioEls.values()) {
      if (el && typeof el.setSinkId === "function") {
        await el.setSinkId(sinkId);
      }
    }
  } catch {}
}

function ensureRemoteInList(peerId) {
  if (!remoteList.value.some(r => r.id === peerId)) {
    remoteList.value.push({ id: peerId });
  }
}

function removeRemote(peerId) {
  remoteList.value = remoteList.value.filter(r => r.id !== peerId);
  remoteStreams.delete(peerId);
  remoteVideoEls.delete(peerId);
  remoteAudioEls.delete(peerId);
}

// --- Peer mesh
function addLocalTracks(pc) {
  if (!localStream) return;
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
}

function createPeer(peerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    socket.emit("call:webrtc:ice", {
      roomId: roomId.value,
      to: peerSocketId,
      candidate: e.candidate,
    });
  };

  pc.ontrack = (e) => {
    const stream = e.streams?.[0];
    if (!stream) return;

    remoteStreams.set(peerSocketId, stream);
    ensureRemoteInList(peerSocketId);

    const v = remoteVideoEls.get(peerSocketId);
    const a = remoteAudioEls.get(peerSocketId);
    if (v && kind.value === "video") v.srcObject = stream;
    if (a) a.srcObject = stream;
  };

  addLocalTracks(pc);
  peers.set(peerSocketId, pc);
  return pc;
}

async function makeOfferTo(peerSocketId) {
  const pc = peers.get(peerSocketId) || createPeer(peerSocketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("call:webrtc:offer", {
    roomId: roomId.value,
    to: peerSocketId,
    offer: pc.localDescription,
  });
}

async function handleOffer(from, offer) {
  const pc = peers.get(from) || createPeer(from);
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("call:webrtc:answer", {
    roomId: roomId.value,
    to: from,
    answer: pc.localDescription,
  });
}

async function handleAnswer(from, answer) {
  const pc = peers.get(from);
  if (!pc) return;
  await pc.setRemoteDescription(answer);
}

async function handleIce(from, candidate) {
  const pc = peers.get(from);
  if (!pc) return;
  try { await pc.addIceCandidate(candidate); } catch {}
}

function closeAllPeers(clearList = true) {
  for (const [id, pc] of peers.entries()) {
    try { pc.close(); } catch {}
    peers.delete(id);
    if (clearList) removeRemote(id);
  }
}

// Join + reconnect
async function joinCall() {
  if (!roomId.value) return;

  busy.value = true;
  ended.value = false;

  try {
    await refreshDevices();
    await loadIceServers();
    await startLocalMedia();

    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("call:join", { roomId: roomId.value });

    startAt.value = Date.now();
  } catch (e) {
    console.error(e);
    alert("Could not start call. Check mic/camera permissions.");
  } finally {
    busy.value = false;
  }
}

async function reconnect() {
  busy.value = true;
  try {
    closeAllPeers(true);
    stopLocalMedia();
    await joinCall();
  } finally {
    busy.value = false;
  }
}

function endCall() {
  if (!roomId.value) return;
  ended.value = true;
  try { socket.emit("call:end", { roomId: roomId.value }); } catch {}
  cleanup();
}

function cleanup() {
  try { closeAllPeers(true); } catch {}
  try { stopLocalMedia(); } catch {}
  try { stopScreenShare(); } catch {}
  try { clearInterval(statsInt); } catch {}
  try { clearInterval(timerInt); } catch {}
}

//
// SOCKET EVENTS
//
socket.on("connect", () => { socketState.value = "connected"; });
socket.on("disconnect", () => { socketState.value = "disconnected"; });

socket.on("call:presence", ({ count }) => {
  presenceCount.value = Number(count || 0);
});

socket.on("call:peer-joined", async ({ roomId: rid, peerSocketId }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!peerSocketId) return;

  try {
    if (socket.id && String(socket.id) > String(peerSocketId)) {
      await makeOfferTo(peerSocketId);
    } else {
      if (!peers.has(peerSocketId)) createPeer(peerSocketId);
    }
  } catch {}
});

socket.on("call:webrtc:offer", async ({ roomId: rid, from, offer }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!from || !offer) return;
  try { await handleOffer(from, offer); } catch {}
});

socket.on("call:webrtc:answer", async ({ roomId: rid, from, answer }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!from || !answer) return;
  try { await handleAnswer(from, answer); } catch {}
});

socket.on("call:webrtc:ice", async ({ roomId: rid, from, candidate }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!from || !candidate) return;
  await handleIce(from, candidate);
});

socket.on("call:ended", ({ roomId: rid }) => {
  if (String(rid) !== String(roomId.value)) return;
  ended.value = true;
  cleanup();
});

// MOUNT
onMounted(async () => {
  await joinCall();
  await nextTick();
  enableSoundOnce();

  timerInt = setInterval(() => { /* reactive via Date.now display */ }, 500);
  statsInt = setInterval(pollStats, 1500);
});

// UNMOUNT
onBeforeUnmount(() => {
  try { socket.emit("call:end", { roomId: roomId.value }); } catch {}
  try { socket.disconnect(); } catch {}
  cleanup();
});
</script>

<style scoped>
.wrap { max-width: 1400px; margin: 0 auto; padding: 18px; }
.top { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom: 14px; }

.titleBlock .titleRow { display:flex; align-items:center; gap:10px; }
.title { font-weight:900; font-size:22px; }
.metaRow { margin-top:4px; opacity:.85; font-size:13px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.dot { opacity:.5; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.rightBtns { display:flex; gap:10px; flex-wrap:wrap; }

.grid { display:grid; grid-template-columns: 2fr 1fr; gap:12px; align-items:start; }
@media (max-width: 1050px){ .grid{ grid-template-columns:1fr; } }

.card { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:18px; padding:14px; backdrop-filter: blur(10px); }
.mediaCard { padding:14px; }
.mediaTop { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.small { font-size:12px; }
.muted { opacity:.8; }

.mediaBtns { display:flex; gap:10px; flex-wrap:wrap; }

.mediaGrid { display:grid; gap:12px; }
.videoGrid { grid-template-columns: 1fr 1fr; }
.audioGrid { grid-template-columns: 1fr 1fr; }
@media (max-width: 900px){ .videoGrid, .audioGrid { grid-template-columns:1fr; } }

.tile { position:relative; border-radius:16px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,0.12); min-height: 240px; }
.label { position:absolute; top:10px; left:10px; z-index:2; font-weight:800; font-size:12px; padding:6px 10px; border-radius:999px;
  background: rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.14); }
.video { width:100%; height:100%; object-fit:cover; display:block; background:#000; }

.avatar { display:grid; place-items:center; height:100%; font-size:44px; color:white; opacity:.9; }
.hintSmall { margin-top:10px; font-size:12px; opacity:.7; }

.statusBar { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
.status { font-weight:800; padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.14); }
.status.ok { background: rgba(40,200,120,.15); border-color: rgba(40,200,120,.30); }
.status.warn { background: rgba(255,180,60,.12); border-color: rgba(255,180,60,.25); }
.hint { opacity:.75; font-size:12px; }

.sideCard { display:flex; flex-direction:column; gap:10px; }
.sideTitle { font-weight:900; }
.list { margin:0; padding-left:18px; opacity:.9; }
.divider { height:1px; background: rgba(255,255,255,.10); margin:8px 0; }

.kv { display:grid; grid-template-columns: 120px 1fr; gap:8px 10px; font-size:13px; opacity:.9; }
.k { opacity:.75; }
.v { font-weight:700; }

.btn, .chip { border:none; border-radius:999px; padding:10px 14px; cursor:pointer; background: rgba(255,255,255,0.12); color:white; }
.btn.primary { background: linear-gradient(45deg,#00c6ff,#0072ff); }
.btn.danger, .chip.danger { background: rgba(255,80,80,.20); border:1px solid rgba(255,80,80,.35); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.12); }

.badge { font-size:12px; padding:5px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
.badge.video { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.audio { border-color: rgba(255,80,120,.35); background: rgba(255,80,120,.15); }
.badge.live { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.14); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }

.deviceCard { margin-bottom: 12px; }
.deviceTitle { font-weight:900; margin-bottom: 10px; }
.deviceGrid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 900px){ .deviceGrid { grid-template-columns: 1fr; } }
.field { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
select { background: rgba(0,0,0,.35); color: white; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 10px; }
.mini { opacity: .7; font-size: 11px; }
.deviceActions { display:flex; justify-content:flex-end; gap: 10px; margin-top: 10px; }
</style>