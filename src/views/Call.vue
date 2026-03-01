<template>
  <Layout>
    <div class="wrap">
      <!-- TOP BAR -->
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="titleBlock">
          <div class="titleRow">
            <div class="title">AddisGo Call</div>

            <span class="badge" :class="kind === 'video' ? 'video' : 'audio'">
              {{ kind.toUpperCase() }}
            </span>

            <span class="badge live" v-if="connected">CONNECTED</span>
            <span class="badge ended" v-if="ended">ENDED</span>

            <span class="badge quality" :class="qualityClass" v-if="!ended">
              {{ qualityLabel }}
            </span>
          </div>

          <div class="metaRow">
            <span>Room: <b class="mono">{{ roomId || "—" }}</b></span>
            <span class="dot">•</span>
            <span>ICE: <b>{{ iceMode }}</b></span>
            <span class="dot">•</span>
            <span>Peers: <b class="mono">{{ peerCount }}</b></span>
            <span class="dot">•</span>
            <span>Socket: <b>{{ socketState }}</b></span>
          </div>
        </div>

        <div class="rightBtns">
          <button class="chip" @click="togglePanel">
            {{ panelOpen ? "Hide Tips" : "Show Tips" }}
          </button>
          <button class="chip danger" @click="endCall" :disabled="busy">
            End Call
          </button>
        </div>
      </header>

      <section class="grid">
        <!-- LEFT: MEDIA -->
        <div class="card mediaCard">
          <!-- STAGE HEADER -->
          <div class="mediaTop">
            <div class="small muted">
              Role: <b>{{ role }}</b>
              <span class="dot">•</span>
              Presence: <b>{{ presenceCount }}</b>
              <span class="dot">•</span>
              Remote: <b>{{ remoteList.length }}</b>
            </div>

            <div class="stageTools">
              <button class="btn ghost" @click="enableSoundOnce">
                Enable Sound
              </button>

              <button
                class="btn ghost"
                @click="togglePip"
                v-if="kind === 'video' && remoteList.length > 0"
              >
                {{ pipMode ? "Standard View" : "PiP View" }}
              </button>

              <button
                class="btn ghost"
                @click="toggleFullscreen"
                v-if="canFullscreen"
              >
                Fullscreen
              </button>
            </div>
          </div>

          <!-- STAGE -->
          <div
            ref="stageEl"
            class="stage"
            :class="[
              kind === 'video' ? 'videoStage' : 'audioStage',
              pipMode ? 'pipMode' : ''
            ]"
          >
            <!-- MAIN REMOTE -->
            <div
              class="tile main"
              v-if="remoteList.length > 0"
            >
              <div class="labelRow">
                <span class="labelPill">Remote</span>

                <span class="miniPill" v-if="kind === 'video'">
                  {{ remoteCamState ? "Cam On" : "Cam Off" }}
                </span>
              </div>

              <video
                v-if="kind === 'video'"
                :ref="setRemoteVideoRef(remoteList[0].id)"
                class="video"
                autoplay
                playsinline
              />

              <div v-else class="avatar">
                👤
                <div class="hintSmall">Audio call</div>
              </div>

              <audio :ref="setRemoteAudioRef(remoteList[0].id)" autoplay />
            </div>

            <!-- SELF -->
            <div class="tile self">
              <div class="labelRow">
                <span class="labelPill">You</span>
                <span class="miniPill">{{ micOn ? "Mic On" : "Muted" }}</span>
              </div>

              <video
                v-if="kind === 'video'"
                ref="localVideo"
                class="video"
                autoplay
                muted
                playsinline
              />

              <div v-else class="avatar">
                🎙️
                <div class="hintSmall">Audio call</div>
              </div>
            </div>

            <!-- EXTRA REMOTES (if more than 1) -->
            <div
              v-for="r in extraRemotes"
              :key="r.id"
              class="tile extra"
            >
              <div class="labelRow">
                <span class="labelPill">Remote</span>
              </div>

              <video
                v-if="kind === 'video'"
                :ref="setRemoteVideoRef(r.id)"
                class="video"
                autoplay
                playsinline
              />

              <div v-else class="avatar">
                👤
                <div class="hintSmall">Connected</div>
              </div>

              <audio :ref="setRemoteAudioRef(r.id)" autoplay />
            </div>
          </div>

          <!-- PRO CONTROL BAR -->
          <div class="controls">
            <button class="ctl" @click="toggleMic" :disabled="!localStreamReady">
              <span class="ctlIcon">{{ micOn ? "🎙️" : "🔇" }}</span>
              <span class="ctlText">{{ micOn ? "Mute" : "Unmute" }}</span>
            </button>

            <button
              class="ctl"
              v-if="kind === 'video'"
              @click="toggleCam"
              :disabled="!localStreamReady"
            >
              <span class="ctlIcon">{{ camOn ? "📷" : "🚫" }}</span>
              <span class="ctlText">{{ camOn ? "Cam Off" : "Cam On" }}</span>
            </button>

            <button
              class="ctl"
              v-if="kind === 'video'"
              @click="flipCamera"
              :disabled="!localStreamReady || !canFlipCamera"
            >
              <span class="ctlIcon">🔄</span>
              <span class="ctlText">Flip</span>
            </button>

            <button
              class="ctl"
              @click="toggleSpeaker"
              :disabled="!canSetSink"
              :title="canSetSink ? 'Route audio output (supported browsers only)' : 'Not supported on this device/browser'"
            >
              <span class="ctlIcon">🔊</span>
              <span class="ctlText">{{ speakerOn ? "Speaker" : "Earpiece" }}</span>
            </button>

            <button class="ctl primary" @click="reconnect" :disabled="busy">
              <span class="ctlIcon">🛠️</span>
              <span class="ctlText">Reconnect</span>
            </button>

            <button class="ctl danger" @click="endCall" :disabled="busy">
              <span class="ctlIcon">⛔</span>
              <span class="ctlText">End</span>
            </button>
          </div>

          <!-- STATUS -->
          <div class="statusBar">
            <div class="status" :class="connected ? 'ok' : 'warn'">
              {{ ended ? "🟥 Call ended" : connected ? "✅ Call connected" : "⚠️ Waiting for peer…" }}
            </div>

            <div class="hint">
              iPhone: if sound doesn’t play, tap “Enable Sound” once.
            </div>
          </div>
        </div>

        <!-- RIGHT: TIPS -->
        <aside v-if="panelOpen" class="card sideCard">
          <div class="sideTitle">Tips</div>
          <ul class="list">
            <li>Low power mode can pause audio/video.</li>
            <li>On iPhone/iPad, tap <b>Enable Sound</b> once.</li>
            <li>If stuck: tap <b>Reconnect</b>.</li>
            <li>TURN is optional; STUN-only works in many networks.</li>
            <li v-if="kind === 'video'">Use <b>Flip</b> to switch camera (mobile).</li>
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

            <div class="k">Quality</div>
            <div class="v">{{ qualityLabel }}</div>
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

const stageEl = ref(null);

// media
const localVideo = ref(null);
let localStream = null;

const micOn = ref(true);
const camOn = ref(true);

const pipMode = ref(false);

// speaker routing / output
const speakerOn = ref(true);
const canSetSink = ref(false);

// camera flip
const facingMode = ref("user"); // user | environment
const canFlipCamera = ref(false);

// quality stats
const qualityLabel = ref("Connecting");
const qualityClass = computed(() => {
  const t = qualityLabel.value.toLowerCase();
  if (t.includes("good")) return "qGood";
  if (t.includes("ok")) return "qOk";
  if (t.includes("bad") || t.includes("weak")) return "qBad";
  return "qWait";
});

// ICE
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s =>
    String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:")
  );
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// peers
const peers = new Map();
const remoteStreams = new Map();
const remoteList = ref([]);

const peerCount = computed(() => peers.size);
const connected = computed(() => remoteList.value.length > 0 && !ended.value);

const extraRemotes = computed(() => remoteList.value.slice(1));

const localStreamReady = computed(() => !!localStream);

// remote refs
const remoteVideoEls = new Map();
const remoteAudioEls = new Map();

const remoteCamState = computed(() => {
  // best-effort: if remote stream has video track enabled
  const first = remoteList.value[0]?.id;
  if (!first) return false;
  const s = remoteStreams.get(first);
  const vt = s?.getVideoTracks?.()?.[0];
  if (!vt) return false;
  return vt.enabled !== false;
});

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

    // detect sink support once
    if (el && typeof el.setSinkId === "function") {
      canSetSink.value = true;
    }
  };
}

// socket
const socket = io(apiUrl, {
  transports: ["websocket", "polling"],
  auth: token ? { token } : undefined,
});

// UI helpers
function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function togglePip() {
  pipMode.value = !pipMode.value;
}

const canFullscreen = computed(() => {
  const el = stageEl.value;
  return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
});

async function toggleFullscreen() {
  try {
    const el = stageEl.value;
    if (!el) return;

    const doc = document;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;

    if (!isFs) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) await req.call(el);
    } else {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) await exit.call(doc);
    }
  } catch {}
}

async function enableSoundOnce() {
  // iOS needs a user gesture to start audio
  try {
    const a = new Audio();
    a.src =
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    await a.play().catch(() => {});
    a.pause();
  } catch {}
}

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

/* =========================
   BEST MEDIA CONSTRAINTS
========================= */
function buildAudioConstraints() {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  };
}

function buildVideoConstraints() {
  // “ideal” so it works on most devices without failing
  return {
    facingMode: facingMode.value,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}

async function startLocalMedia() {
  const constraints = {
    audio: buildAudioConstraints(),
    video: kind.value === "video" ? buildVideoConstraints() : false,
  };

  localStream = await navigator.mediaDevices.getUserMedia(constraints);

  // can flip if multiple cameras are available or environment facing supported
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === "videoinput");
    canFlipCamera.value = cams.length > 1;
  } catch {
    canFlipCamera.value = true; // allow attempt; it’ll just fail gracefully
  }

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

async function flipCamera() {
  if (kind.value !== "video") return;
  if (!localStream) return;

  // switch facing mode and re-acquire ONLY video track
  try {
    facingMode.value = facingMode.value === "user" ? "environment" : "user";

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildVideoConstraints(),
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    // replace track in local stream
    const oldVideoTrack = localStream.getVideoTracks()[0];
    if (oldVideoTrack) oldVideoTrack.stop();

    // remove old video track from localStream, add new one
    if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
    localStream.addTrack(newVideoTrack);

    // update local preview
    if (localVideo.value) localVideo.value.srcObject = localStream;

    // replace in all peer connections
    for (const pc of peers.values()) {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
      if (sender) await sender.replaceTrack(newVideoTrack);
    }

    camOn.value = true;
  } catch (e) {
    console.warn("Flip camera failed:", e?.message || e);
  }
}

async function toggleSpeaker() {
  // Only works on browsers supporting setSinkId (mostly desktop Chromium).
  // iOS Safari does not allow choosing output device.
  speakerOn.value = !speakerOn.value;

  if (!canSetSink.value) return;

  try {
    // If you later add a dropdown for output devices, you can set deviceId here.
    // For now we just keep default output. This toggle is a “UI affordance”.
    // Some Android/Chromium may still route differently depending on OS.
    // No-op safely.
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

function addLocalTracks(pc) {
  if (!localStream) return;
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
}

/* =========================
   PEER + SIGNALING (UNCHANGED)
========================= */
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

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "failed") qualityLabel.value = "Bad (reconnect)";
    if (st === "connected") qualityLabel.value = "Good";
    if (st === "disconnected") qualityLabel.value = "Weak";
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

function closeAllPeers() {
  for (const [id, pc] of peers.entries()) {
    try { pc.close(); } catch {}
    peers.delete(id);
    removeRemote(id);
  }
}

/* =========================
   QUALITY STATS (BEST UX)
========================= */
let statsTimer = null;

async function pollQuality() {
  try {
    // pick the first peer connection
    const first = peers.values().next().value;
    if (!first) {
      qualityLabel.value = ended.value ? "Ended" : "Connecting";
      return;
    }

    const stats = await first.getStats();
    let rttMs = null;
    let jitter = null;
    let packetsLost = 0;
    let packets = 0;

    stats.forEach((r) => {
      // inbound for remote
      if (r.type === "inbound-rtp" && (r.kind === "audio" || r.kind === "video")) {
        packetsLost += r.packetsLost || 0;
        packets += r.packetsReceived || 0;
        if (typeof r.jitter === "number") jitter = r.jitter;
      }
      // candidate pair has RTT
      if (r.type === "candidate-pair" && r.state === "succeeded" && typeof r.currentRoundTripTime === "number") {
        rttMs = Math.round(r.currentRoundTripTime * 1000);
      }
    });

    const lossPct = packets > 0 ? (packetsLost / (packets + packetsLost)) * 100 : 0;

    // simple quality grading
    if (rttMs === null) {
      qualityLabel.value = connected.value ? "OK" : "Connecting";
      return;
    }

    if (rttMs < 120 && lossPct < 2) qualityLabel.value = "Good";
    else if (rttMs < 250 && lossPct < 5) qualityLabel.value = "OK";
    else qualityLabel.value = "Bad";

  } catch {
    // ignore
  }
}

function startStatsTimer() {
  stopStatsTimer();
  statsTimer = setInterval(pollQuality, 1500);
}

function stopStatsTimer() {
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = null;
}

/* =========================
   JOIN / RECONNECT
========================= */
async function joinCall() {
  if (!roomId.value) return;

  busy.value = true;
  ended.value = false;
  qualityLabel.value = "Connecting";

  try {
    await loadIceServers();
    await startLocalMedia();

    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("call:join", { roomId: roomId.value });

    startStatsTimer();
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
    closeAllPeers();
    stopLocalMedia();
    await joinCall();
  } finally {
    busy.value = false;
  }
}

function endCall() {
  if (!roomId.value) return;
  ended.value = true;
  qualityLabel.value = "Ended";

  try { socket.emit("call:end", { roomId: roomId.value }); } catch {}
  cleanup();
}

function cleanup() {
  stopStatsTimer();
  try { closeAllPeers(); } catch {}
  try { stopLocalMedia(); } catch {}
}

/* =========================
   SOCKET EVENTS
========================= */
socket.on("connect", () => {
  socketState.value = "connected";
});

socket.on("disconnect", () => {
  socketState.value = "disconnected";
  if (!ended.value) qualityLabel.value = "Weak";
});

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
  qualityLabel.value = "Ended";
  cleanup();
});

/* =========================
   MOUNT / UNMOUNT
========================= */
onMounted(async () => {
  await joinCall();
  await nextTick();
  enableSoundOnce();
});

onBeforeUnmount(() => {
  try { socket.emit("call:end", { roomId: roomId.value }); } catch {}
  try { socket.disconnect(); } catch {}
  cleanup();
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

.titleBlock .titleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.title {
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.2px;
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
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.rightBtns { display: flex; gap: 10px; }

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

.mediaCard { padding: 14px; }

.mediaTop {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.small { font-size: 12px; }
.muted { opacity: 0.8; }

.stageTools { display: flex; gap: 10px; flex-wrap: wrap; }

/* ===== Stage Layout ===== */
.stage {
  display: grid;
  gap: 12px;
}

/* default responsive:
   - phone: stacked
   - desktop: 2 columns */
.videoStage {
  grid-template-columns: 1fr;
}

@media (min-width: 900px) {
  .videoStage {
    grid-template-columns: 1.6fr 1fr;
    align-items: stretch;
  }
}

.audioStage {
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .audioStage {
    grid-template-columns: 1fr 1fr;
  }
}

/* PiP mode: remote becomes full, self becomes floating */
.pipMode {
  position: relative;
  grid-template-columns: 1fr;
}
.pipMode .tile.self {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: min(38vw, 220px);
  height: min(26vh, 160px);
  z-index: 5;
  box-shadow: 0 18px 45px rgba(0,0,0,0.35);
}

/* Tiles */
.tile {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255,255,255,0.12);
  min-height: 240px;
}

.tile.main {
  min-height: 360px;
}

@media (max-width: 520px) {
  .tile.main { min-height: 340px; }
  .tile { min-height: 240px; }
}

.labelRow {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
  display: flex;
  gap: 8px;
  align-items: center;
}

.labelPill {
  font-weight: 900;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.14);
  color: white;
}

.miniPill {
  font-weight: 800;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  color: white;
  backdrop-filter: blur(10px);
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}

.avatar {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 44px;
  color: white;
  opacity: 0.9;
}
.hintSmall {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.7;
}

/* ===== Pro Controls ===== */
.controls {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
@media (max-width: 900px) {
  .controls { grid-template-columns: repeat(3, 1fr); }
}

.ctl {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: white;
  border-radius: 16px;
  padding: 10px 10px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  transition: transform .08s ease, background .12s ease;
}
.ctl:active { transform: scale(0.98); }
.ctl:disabled { opacity: .55; cursor: not-allowed; }

.ctlIcon { font-size: 18px; }
.ctlText { font-weight: 900; font-size: 13px; }

.ctl.primary {
  background: linear-gradient(45deg,#00c6ff,#0072ff);
  border: none;
}
.ctl.danger {
  background: rgba(255,80,80,.20);
  border: 1px solid rgba(255,80,80,.35);
}

/* ===== Status ===== */
.statusBar {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.status {
  font-weight: 900;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
}
.status.ok {
  background: rgba(40,200,120,.15);
  border-color: rgba(40,200,120,.30);
}
.status.warn {
  background: rgba(255,180,60,.12);
  border-color: rgba(255,180,60,.25);
}
.hint { opacity: .75; font-size: 12px; }

/* ===== Side ===== */
.sideCard { display: flex; flex-direction: column; gap: 10px; }
.sideTitle { font-weight: 900; }
.list { margin: 0; padding-left: 18px; opacity: .9; }
.divider { height: 1px; background: rgba(255,255,255,.10); margin: 8px 0; }

.kv {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 10px;
  font-size: 13px;
  opacity: .9;
}
.k { opacity: .75; }
.v { font-weight: 800; }

/* ===== Buttons ===== */
.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.chip.danger { background: rgba(255,80,80,.20); border: 1px solid rgba(255,80,80,.35); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }

/* ===== Badges ===== */
.badge {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
}
.badge.video { border-color: rgba(80,160,255,.35); background: rgba(80,160,255,.12); }
.badge.audio { border-color: rgba(255,80,120,.35); background: rgba(255,80,120,.15); }
.badge.live { border-color: rgba(40,200,120,.30); background: rgba(40,200,120,.14); }
.badge.ended { border-color: rgba(255,80,80,.25); background: rgba(255,80,80,.12); }

.badge.quality { font-weight: 900; }
.badge.quality.qGood { border-color: rgba(40,200,120,.35); background: rgba(40,200,120,.16); }
.badge.quality.qOk { border-color: rgba(255,180,60,.30); background: rgba(255,180,60,.14); }
.badge.quality.qBad { border-color: rgba(255,80,80,.30); background: rgba(255,80,80,.14); }
.badge.quality.qWait { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.06); }
</style>