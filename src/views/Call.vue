<template>
  <Layout>
    <div class="page">
      <div class="head">
        <button class="btn" @click="goBack">← Back</button>

        <div class="headCenter">
          <div class="title">📞 Direct Call</div>
          <div class="sub">{{ displayName }} • {{ kind }}</div>
        </div>

        <button class="danger" @click="endCall">End</button>
      </div>

      <div v-if="incomingCall && !inCall && mode !== 'caller'" class="incomingCard">
        <div class="incomingTop">
          <div class="incomingTitle">Incoming {{ incomingCall.kind || kind }} call</div>
          <div class="incomingSub">{{ incomingCall.fromName || displayName }}</div>
        </div>

        <div class="controls">
          <button class="btn" @click="rejectIncoming">Decline</button>
          <button class="accept" @click="acceptIncoming">Answer</button>
        </div>
      </div>

      <div v-else-if="!roomId" class="card">
        <div class="big">Missing roomId</div>
        <div class="small">
          Start the call from People so the app can generate the call room correctly.
        </div>
      </div>

      <div v-else class="card">
        <div class="metaRow">
          <div class="pill">{{ modeLabel }}</div>
          <div class="pill">{{ kind }}</div>
          <div class="muted">roomId: {{ roomId }}</div>
        </div>

        <div v-if="kind === 'video'" class="videoWrap">
          <video
            ref="remoteVideoEl"
            class="video remoteVideo"
            autoplay
            playsinline
          ></video>

          <video
            ref="localVideoEl"
            class="video localVideo"
            autoplay
            playsinline
            muted
          ></video>
        </div>

        <div v-else class="audioCard">
          <div class="audioEmoji">🎧</div>
          <div class="audioTitle">Audio Call</div>
          <div class="audioSub">{{ statusText }}</div>
        </div>

        <div class="controls">
          <button class="btn" @click="toggleMute">
            {{ muted ? "Unmute" : "Mute" }}
          </button>

          <button v-if="kind === 'video'" class="btn" @click="toggleCam">
            {{ camOff ? "Camera On" : "Camera Off" }}
          </button>

          <button
            v-if="mode === 'caller' && !hasRequested && toUserId"
            class="btn"
            @click="startOutgoingCall"
          >
            Start Call
          </button>
        </div>

        <div class="notice">{{ statusText }}</div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket from "../socket.js";

const router = useRouter();
const route = useRoute();

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const roomId = ref(String(route.query.roomId || ""));
const kind = ref(String(route.query.kind || "video"));
const mode = ref(String(route.query.mode || "caller"));
const toUserId = ref(String(route.query.toUserId || ""));
const displayName = ref(String(route.query.name || "User"));

const localVideoEl = ref(null);
const remoteVideoEl = ref(null);

const muted = ref(false);
const camOff = ref(false);
const inCall = ref(false);
const hasRequested = ref(false);
const incomingCall = ref(null);
const statusText = ref("Preparing call...");

let localStream = null;
let pc = null;
let currentPeerSocketId = null;

const modeLabel = computed(() => {
  if (incomingCall.value && !inCall.value && mode.value !== "caller") return "Incoming";
  if (inCall.value) return "Connected";
  if (mode.value === "callee") return "Answering";
  return "Calling";
});

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function goBack() {
  router.push("/people");
}

function authPayload() {
  const me = getMe();
  return {
    id: String(me?.id || ""),
    username: me?.username || me?.display_name || me?.name || "User",
  };
}

async function getTurnConfig() {
  try {
    const res = await fetch(`${apiBase}/api/turn`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.iceServers)) return data.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

async function ensureMedia() {
  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: kind.value === "video",
    audio: true,
  });

  if (localVideoEl.value && kind.value === "video") {
    localVideoEl.value.srcObject = localStream;
    await localVideoEl.value.play().catch(() => {});
  }

  return localStream;
}

async function ensurePeerConnection() {
  if (pc) return pc;

  const iceServers = await getTurnConfig();
  pc = new RTCPeerConnection({ iceServers });

  const stream = await ensureMedia();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (remoteVideoEl.value && stream) {
      remoteVideoEl.value.srcObject = stream;
      remoteVideoEl.value.play?.().catch(() => {});
    }
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate || !roomId.value || !currentPeerSocketId) return;
    socket.emit("call:webrtc:ice", {
      roomId: roomId.value,
      candidate: event.candidate,
      to: currentPeerSocketId,
    });
  };

  pc.onconnectionstatechange = () => {
    const state = pc?.connectionState || "new";
    statusText.value = `Connection: ${state}`;
    if (["connected", "completed"].includes(state)) inCall.value = true;
  };

  return pc;
}

async function makeOffer(targetSocketId) {
  currentPeerSocketId = targetSocketId;
  const peer = await ensurePeerConnection();
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit("call:webrtc:offer", {
    roomId: roomId.value,
    offer,
    to: targetSocketId,
  });
}

async function startOutgoingCall() {
  const me = getMe();
  if (!toUserId.value) return;

  if (String(toUserId.value) === String(me?.id || "")) {
    statusText.value = "You cannot call yourself.";
    return;
  }

  hasRequested.value = true;
  statusText.value = "Calling...";

  socket.emit("call:request", {
    toUserId: toUserId.value,
    kind: kind.value,
  });
}

async function acceptIncoming() {
  if (!incomingCall.value) return;

  roomId.value = String(incomingCall.value.roomId || roomId.value);
  kind.value = String(incomingCall.value.kind || kind.value);
  displayName.value = String(incomingCall.value.fromName || displayName.value);
  mode.value = "callee";

  await ensureMedia();

  socket.emit("call:accept", { roomId: roomId.value });
  socket.emit("call:join", { roomId: roomId.value });

  statusText.value = "Joining call...";
  incomingCall.value = null;
}

function rejectIncoming() {
  if (!incomingCall.value?.roomId) return;
  socket.emit("call:reject", { roomId: incomingCall.value.roomId });
  incomingCall.value = null;
  statusText.value = "Call declined";
}

function toggleMute() {
  if (!localStream) return;
  muted.value = !muted.value;
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = !muted.value;
  });
}

function toggleCam() {
  if (!localStream) return;
  camOff.value = !camOff.value;
  localStream.getVideoTracks().forEach((t) => {
    t.enabled = !camOff.value;
  });
}

function cleanup() {
  try {
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pc = null;
    }
  } catch {}

  try {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
  } catch {}

  currentPeerSocketId = null;
  inCall.value = false;
}

function endCall() {
  try {
    if (roomId.value) socket.emit("call:end", { roomId: roomId.value });
  } catch {}
  cleanup();
  router.push("/people");
}

function connectSocket() {
  const me = getMe();

  const onConnect = () => {
    socket.emit("register-user", authPayload());

    if (mode.value === "caller" && toUserId.value && !hasRequested.value) {
      startOutgoingCall();
    }
  };

  const onIncoming = (payload) => {
    // ✅ ignore incoming events on caller page
    if (mode.value === "caller") return;

    // ✅ ignore self-call weirdness
    if (String(payload?.fromUserId || "") === String(me?.id || "")) return;

    incomingCall.value = payload;
    roomId.value = String(payload?.roomId || roomId.value);
    kind.value = String(payload?.kind || kind.value);
    displayName.value = String(payload?.fromName || displayName.value);
    mode.value = "callee";
    statusText.value = "Incoming call...";
  };

  const onRinging = ({ roomId: rid }) => {
    if (rid) roomId.value = String(rid);
    statusText.value = "Ringing...";
  };

  const onAccepted = async ({ roomId: rid }) => {
    if (rid) roomId.value = String(rid);
    statusText.value = "Accepted. Joining...";
    await ensureMedia();
    socket.emit("call:join", { roomId: roomId.value });
  };

  const onJoined = async ({ peerSocketIds = [], shouldCreateOffer }) => {
    await ensureMedia();
    if (shouldCreateOffer && peerSocketIds.length) {
      await makeOffer(peerSocketIds[0]);
    }
  };

  const onPeerJoined = async ({ peerSocketId }) => {
    if (mode.value === "caller") {
      await makeOffer(peerSocketId);
    }
  };

  const onOffer = async ({ offer, fromSocketId }) => {
    currentPeerSocketId = fromSocketId;
    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("call:webrtc:answer", {
      roomId: roomId.value,
      answer,
      to: fromSocketId,
    });
  };

  const onAnswer = async ({ answer, fromSocketId }) => {
    currentPeerSocketId = fromSocketId;
    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const onIce = async ({ candidate }) => {
    try {
      const peer = await ensurePeerConnection();
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("ICE add error:", e);
    }
  };

  const onEnded = () => {
    statusText.value = "Call ended";
    cleanup();
  };

  const onOffline = ({ message }) => {
    statusText.value = message || "User offline";
  };

  const onError = ({ message }) => {
    statusText.value = message || "Call error";
  };

  const onBusy = ({ message }) => {
    statusText.value = message || "User is busy";
  };

  socket.on("connect", onConnect);
  socket.on("call:incoming", onIncoming);
  socket.on("call:ringing", onRinging);
  socket.on("call:accepted", onAccepted);
  socket.on("call:joined", onJoined);
  socket.on("call:peer-joined", onPeerJoined);
  socket.on("call:webrtc:offer", onOffer);
  socket.on("call:webrtc:answer", onAnswer);
  socket.on("call:webrtc:ice", onIce);
  socket.on("call:ended", onEnded);
  socket.on("call:offline", onOffline);
  socket.on("call:error", onError);
  socket.on("call:busy", onBusy);

  if (socket.connected) onConnect();

  return () => {
    socket.off("connect", onConnect);
    socket.off("call:incoming", onIncoming);
    socket.off("call:ringing", onRinging);
    socket.off("call:accepted", onAccepted);
    socket.off("call:joined", onJoined);
    socket.off("call:peer-joined", onPeerJoined);
    socket.off("call:webrtc:offer", onOffer);
    socket.off("call:webrtc:answer", onAnswer);
    socket.off("call:webrtc:ice", onIce);
    socket.off("call:ended", onEnded);
    socket.off("call:offline", onOffline);
    socket.off("call:error", onError);
    socket.off("call:busy", onBusy);
  };
}

let cleanupSocket = null;

onMounted(async () => {
  cleanupSocket = connectSocket();

  if (roomId.value && mode.value === "callee") {
    await ensureMedia();
  }
});

onBeforeUnmount(() => {
  try {
    cleanupSocket?.();
  } catch {}
  cleanup();
});
</script>

<style scoped>
.page{
  max-width:980px;
  margin:0 auto;
  padding:18px;
  color:#fff;
}
.head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:14px;
}
.headCenter{
  flex:1;
  text-align:center;
}
.btn,.danger,.accept{
  border:none;
  border-radius:999px;
  padding:12px 16px;
  color:#fff;
  font-weight:900;
}
.btn{background:rgba(255,255,255,.12)}
.accept{background:linear-gradient(45deg,#00c97b,#00e39f)}
.danger{background:rgba(255,82,82,.18);border:1px solid rgba(255,82,82,.24)}
.title{font-size:28px;font-weight:950}
.sub{opacity:.75}
.card,.incomingCard{
  padding:18px;
  border-radius:24px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
}
.big,.incomingTitle{font-size:22px;font-weight:950}
.small,.incomingSub{opacity:.75;margin-top:6px}
.metaRow{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-bottom:14px;
}
.pill{
  padding:10px 14px;
  border-radius:999px;
  background:rgba(255,255,255,.10);
  font-weight:900;
}
.muted{
  opacity:.72;
  word-break:break-all;
}
.videoWrap{
  position:relative;
  display:grid;
  gap:12px;
}
.video{
  width:100%;
  min-height:220px;
  background:#000;
  border-radius:22px;
  display:block;
}
.remoteVideo{
  min-height:280px;
}
.localVideo{
  min-height:180px;
}
.audioCard{
  min-height:220px;
  display:grid;
  place-items:center;
  border-radius:22px;
  background:rgba(0,0,0,.28);
  text-align:center;
  padding:20px;
}
.audioEmoji{font-size:48px}
.audioTitle{font-size:28px;font-weight:900;margin-top:8px}
.audioSub{opacity:.78;margin-top:8px}
.controls{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:14px;
}
.notice{
  margin-top:14px;
  opacity:.8;
  line-height:1.5;
}
@media (max-width: 640px){
  .head{
    align-items:flex-start;
  }
  .headCenter{
    text-align:left;
  }
}
</style>