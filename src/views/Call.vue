<template>
  <Layout>
    <div class="wrap">
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
          <div class="mediaTop">
            <div class="small muted">
              Role: <b>{{ role }}</b>
              <span class="dot">•</span>
              Presence: <b>{{ presenceCount }}</b>
            </div>

            <div class="mediaBtns">
              <button class="btn ghost" @click="enableSoundOnce">
                Enable Sound
              </button>

              <button class="btn ghost" @click="toggleMic" :disabled="!localStream">
                {{ micOn ? "Mute" : "Unmute" }}
              </button>

              <button
                class="btn ghost"
                v-if="kind === 'video'"
                @click="toggleCam"
                :disabled="!localStream"
              >
                {{ camOn ? "Cam Off" : "Cam On" }}
              </button>

              <button class="btn primary" @click="reconnect" :disabled="busy">
                Reconnect
              </button>
            </div>
          </div>

          <div class="mediaGrid" :class="kind === 'video' ? 'videoGrid' : 'audioGrid'">
            <!-- Local -->
            <div class="tile">
              <div class="label">You</div>

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

            <!-- Remote tiles -->
            <div v-for="r in remoteList" :key="r.id" class="tile">
              <div class="label">Remote</div>

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

              <!-- For audio calls we still need an audio element -->
              <audio :ref="setRemoteAudioRef(r.id)" autoplay />
            </div>
          </div>

          <div class="statusBar">
            <div class="status" :class="connected ? 'ok' : 'warn'">
              {{ connected ? "✅ Call connected" : "⚠️ Waiting for peer…" }}
            </div>
            <div class="hint">
              If ringtone doesn’t play on iPhone, tap “Enable Sound” once.
            </div>
          </div>
        </div>

        <!-- RIGHT: TIPS -->
        <aside v-if="panelOpen" class="card sideCard">
          <div class="sideTitle">Tips</div>
          <ul class="list">
            <li>Keep screen awake (low power mode can pause audio).</li>
            <li>On iPhone/iPad, tap <b>Enable Sound</b> once.</li>
            <li>If stuck: tap <b>Reconnect</b>.</li>
            <li>TURN is optional; STUN-only works in many networks.</li>
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

// identity (same pattern as your other pages)
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const token = localStorage.getItem("token");

// params
const roomId = ref(String(route.query.roomId || ""));
const kind = ref(route.query.kind === "video" ? "video" : "audio"); // audio|video
const role = ref(String(route.query.role || "member")); // caller/callee/member

// UI state
const panelOpen = ref(true);
const busy = ref(false);
const ended = ref(false);

const socketState = ref("connecting");
const presenceCount = ref(0);

// WebRTC / media
const localVideo = ref(null);
let localStream = null;

const micOn = ref(true);
const camOn = ref(true);

const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s =>
    String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:")
  );
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// Peer mesh: one RTCPeerConnection per remote socket id
const peers = new Map(); // peerSocketId -> RTCPeerConnection
const remoteStreams = new Map(); // peerSocketId -> MediaStream
const remoteList = ref([]); // [{id}]

const peerCount = computed(() => peers.size);
const connected = computed(() => remoteList.value.length > 0 && !ended.value);

// Remote element refs
const remoteVideoEls = new Map(); // peerId -> el
const remoteAudioEls = new Map(); // peerId -> el

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

// socket
const socket = io(apiUrl, {
  transports: ["websocket", "polling"],
  auth: token ? { token } : undefined,
});

// --- helpers
function togglePanel() {
  panelOpen.value = !panelOpen.value;
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

async function startLocalMedia() {
  // Always grab audio. Video only if kind=video.
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind.value === "video" ? { width: 1280, height: 720 } : false,
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

// --- peer creation
function addLocalTracks(pc) {
  if (!localStream) return;
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
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
    // some browsers send multiple streams; we just use first
    const stream = e.streams?.[0];
    if (!stream) return;

    remoteStreams.set(peerSocketId, stream);
    ensureRemoteInList(peerSocketId);

    // attach immediately if elements exist
    const v = remoteVideoEls.get(peerSocketId);
    const a = remoteAudioEls.get(peerSocketId);
    if (v && kind.value === "video") v.srcObject = stream;
    if (a) a.srcObject = stream;
  };

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === "failed" || st === "disconnected" || st === "closed") {
      // cleanup softly
      // (keep some tolerance; user can hit reconnect)
    }
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
  try {
    await pc.addIceCandidate(candidate);
  } catch {}
}

function closeAllPeers() {
  for (const [id, pc] of peers.entries()) {
    try { pc.close(); } catch {}
    peers.delete(id);
    removeRemote(id);
  }
}

// --- join + reconnect
async function joinCall() {
  if (!roomId.value) return;

  busy.value = true;
  ended.value = false;

  try {
    await loadIceServers();
    await startLocalMedia();

    // register user online (dashboard uses this too)
    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("call:join", { roomId: roomId.value });
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
  try {
    socket.emit("call:end", { roomId: roomId.value });
  } catch {}
  cleanup();
}

function cleanup() {
  try { closeAllPeers(); } catch {}
  try { stopLocalMedia(); } catch {}
}

//
// SOCKET EVENTS
//
socket.on("connect", () => {
  socketState.value = "connected";
});

socket.on("disconnect", () => {
  socketState.value = "disconnected";
});

socket.on("call:presence", ({ count }) => {
  presenceCount.value = Number(count || 0);
});

socket.on("call:ready", async ({ roomId: rid }) => {
  if (String(rid) !== String(roomId.value)) return;

  // when ready, we can start mesh offers.
  // Rule: to avoid double-offer glare, only initiate offers if my socket.id is "larger"
  // (simple deterministic tie-breaker).
  // But we still need peers list: server gives "peer-joined" events.
});

socket.on("call:peer-joined", async ({ roomId: rid, peerSocketId }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!peerSocketId) return;

  // Decide who offers to avoid glare:
  // If my socket.id > peerSocketId, I create offer.
  // Otherwise I wait for their offer.
  try {
    if (socket.id && String(socket.id) > String(peerSocketId)) {
      await makeOfferTo(peerSocketId);
    } else {
      // create pc early so it can receive offer cleanly
      if (!peers.has(peerSocketId)) createPeer(peerSocketId);
    }
  } catch {}
});

socket.on("call:webrtc:offer", async ({ roomId: rid, from, offer }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!from || !offer) return;
  try {
    await handleOffer(from, offer);
  } catch {}
});

socket.on("call:webrtc:answer", async ({ roomId: rid, from, answer }) => {
  if (String(rid) !== String(roomId.value)) return;
  if (!from || !answer) return;
  try {
    await handleAnswer(from, answer);
  } catch {}
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

  // iOS autoplay helper (nice UX)
  await nextTick();
  enableSoundOnce();
});

// UNMOUNT
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

.mediaBtns { display: flex; gap: 10px; flex-wrap: wrap; }

.mediaGrid {
  display: grid;
  gap: 12px;
}
.videoGrid {
  grid-template-columns: 1fr 1fr;
}
.audioGrid {
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 900px) {
  .videoGrid, .audioGrid { grid-template-columns: 1fr; }
}

.tile {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255,255,255,0.12);
  min-height: 220px;
}
.label {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  font-weight: 800;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.14);
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

.statusBar {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.status {
  font-weight: 800;
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
.v { font-weight: 700; }

.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.btn.primary { background: linear-gradient(45deg,#00c6ff,#0072ff); }
.btn.danger, .chip.danger { background: rgba(255,80,80,.20); border: 1px solid rgba(255,80,80,.35); }
.btn.ghost, .chip { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }

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
</style>