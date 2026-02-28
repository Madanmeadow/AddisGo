<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>
        <div class="title">
          📞 AddisGo Call
          <span class="meta">Room: <b class="mono">{{ roomId || "—" }}</b></span>
          <span class="meta dot">•</span>
          <span class="meta">ICE: <b>{{ iceMode }}</b></span>
          <span class="meta dot">•</span>
          <span class="meta">Peers: <b class="mono">{{ peerCount }}</b></span>
          <span class="meta dot">•</span>
          <span class="meta">Socket: <b class="mono">{{ socketState }}</b></span>
        </div>

        <div class="right">
          <button class="chip primary" @click="endCall">End Call</button>
        </div>
      </header>

      <section class="grid">
        <div class="card video">
          <div class="label">Local</div>
          <video ref="localEl" autoplay playsinline muted class="vid"></video>

          <div class="controls">
            <button class="btn ghost" @click="toggleMic" :disabled="!localStream">
              {{ micOn ? "Mute" : "Unmute" }}
            </button>
            <button class="btn ghost" v-if="kind==='video'" @click="toggleCam" :disabled="!localStream">
              {{ camOn ? "Cam Off" : "Cam On" }}
            </button>
          </div>
        </div>

        <div class="card video">
          <div class="label">Remote</div>
          <video ref="remoteEl" autoplay playsinline class="vid"></video>

          <div class="hint">
            If remote stays blank on iPhone/iPad, tap the remote video once (Safari autoplay rules).
          </div>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const route = useRoute();
const apiUrl = import.meta.env.VITE_API_URL;

const me = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();
const roomId = String(route.query.roomId || "");
const kind = String(route.query.kind || "audio"); // "audio" | "video"

const socketState = ref("connecting");

// video refs
const localEl = ref(null);
const remoteEl = ref(null);

// media
let localStream = null;
const micOn = ref(true);
const camOn = ref(true);

// ICE
const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }]);
const iceMode = computed(() => {
  const hasTurn = iceServers.value.some(s => String(s.urls || "").includes("turn:") || String(s.urls || "").includes("turns:"));
  return hasTurn ? "STUN+TURN" : "STUN only";
});

// peers (socket.id -> pc)
const pcs = new Map();
const peerCount = computed(() => pcs.size);

const socket = io(apiUrl, { transports: ["websocket", "polling"] });

async function loadIceServers() {
  try {
    const r = await fetch(`${apiUrl}/api/turn`);
    const data = await r.json();
    if (data?.ok && Array.isArray(data.iceServers) && data.iceServers.length) {
      iceServers.value = data.iceServers;
    }
  } catch {}
}

async function startLocal() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind === "video" ? { width: 1280, height: 720 } : false,
  });
  micOn.value = true;
  camOn.value = true;
  if (localEl.value) localEl.value.srcObject = localStream;
}

function stopLocal() {
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

function makePC(peerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("call:webrtc:ice", { roomId, to: peerSocketId, candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    // for 1:1 this is enough
    if (remoteEl.value) remoteEl.value.srcObject = e.streams[0];
  };

  addLocalTracks(pc);
  pcs.set(peerSocketId, pc);
  return pc;
}

async function createOfferTo(peerSocketId) {
  const pc = makePC(peerSocketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("call:webrtc:offer", { roomId, to: peerSocketId, offer: pc.localDescription });
}

function closeAllPCs() {
  for (const pc of pcs.values()) {
    try { pc.close(); } catch {}
  }
  pcs.clear();
}

function endCall() {
  try { socket.emit("call:end", { roomId }); } catch {}
  cleanup();
}

function cleanup() {
  closeAllPCs();
  stopLocal();
  try { socket.disconnect(); } catch {}
}

socket.on("connect", () => {
  socketState.value = "connected";
  if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });
});

socket.on("disconnect", () => {
  socketState.value = "disconnected";
});

// someone joined -> existing peers create offer to them (mesh)
socket.on("call:peer-joined", async ({ peerSocketId }) => {
  if (!peerSocketId) return;
  // don’t create duplicate
  if (pcs.has(peerSocketId)) return;
  try { await createOfferTo(peerSocketId); } catch {}
});

// offer from peer
socket.on("call:webrtc:offer", async ({ offer, from }) => {
  if (!offer || !from) return;

  // ensure pc
  let pc = pcs.get(from);
  if (!pc) pc = makePC(from);

  try {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("call:webrtc:answer", { roomId, to: from, answer: pc.localDescription });
  } catch {}
});

// answer from peer
socket.on("call:webrtc:answer", async ({ answer, from }) => {
  if (!answer || !from) return;
  const pc = pcs.get(from);
  if (!pc) return;
  try { await pc.setRemoteDescription(answer); } catch {}
});

// ice from peer
socket.on("call:webrtc:ice", async ({ candidate, from }) => {
  if (!candidate || !from) return;
  const pc = pcs.get(from);
  if (!pc) return;
  try { await pc.addIceCandidate(candidate); } catch {}
});

socket.on("call:ended", () => cleanup());

onMounted(async () => {
  if (!roomId) return alert("Missing roomId");
  await loadIceServers();
  await startLocal();
  socket.emit("call:join", { roomId });
});

onBeforeUnmount(() => cleanup());
</script>

<style scoped>
.wrap { max-width: 1200px; margin: 0 auto; padding: 18px; }
.top { display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:14px; }
.title { font-weight:900; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.meta { opacity:.85; font-weight:600; font-size:13px; }
.dot { opacity:.5; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
@media(max-width: 900px){ .grid{ grid-template-columns:1fr; } }

.card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
}
.video { display:flex; flex-direction:column; gap:10px; }
.label { font-weight:900; opacity:.9; }
.vid { width:100%; background:#000; border-radius:16px; max-height:60vh; }
.controls { display:flex; gap:10px; flex-wrap:wrap; }
.hint { font-size:12px; opacity:.75; }

.btn, .chip {
  border:none; border-radius:999px; padding:10px 14px; cursor:pointer;
  background: rgba(255,255,255,0.12); color:white;
}
.btn.ghost { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }
.chip.primary { background: linear-gradient(45deg,#ff416c,#ff4b2b); }
</style>