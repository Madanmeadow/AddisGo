<template>
  <Layout>
    <div class="page">
      <div class="head">
        <button class="back" @click="goBack">← Back</button>

        <div class="titleBlock">
          <div class="title">🔴 Pulse Live</div>
          <div class="sub">{{ modeLabel }}</div>
        </div>

        <button class="danger" @click="leave">Leave</button>
      </div>

      <div v-if="!liveId" class="card">
        <div class="big">Live Lobby</div>
        <div class="small">Create a live room or open an existing one.</div>

        <div class="actions">
          <button class="primary" @click="startHost">Start Live</button>
          <input
            v-model="joinId"
            class="input"
            placeholder="Enter liveId to watch..."
          />
          <button class="btn" @click="joinWatch">Watch</button>
        </div>
      </div>

      <div v-else class="card">
        <div class="row">
          <div class="badge">{{ mode === "host" ? "HOSTING" : "WATCHING" }}</div>
          <div class="meta">liveId: {{ liveId }}</div>
        </div>

        <div class="tools">
          <div class="viewerPill">👁 {{ viewerCount }} watching</div>
          <button class="btn" @click="copyInvite">Copy Invite</button>
          <button class="btn" @click="shareInvite">Share</button>
        </div>

        <!-- host local preview -->
        <video
          v-if="mode === 'host'"
          ref="localVideoEl"
          class="video"
          autoplay
          playsinline
          muted
        ></video>

        <!-- watcher remote stream -->
        <video
          v-else
          ref="remoteVideoEl"
          class="video"
          autoplay
          playsinline
          controls
        ></video>

        <div class="notice">
          {{
            mode === "host"
              ? "Your local camera preview is running. Share this liveId with viewers."
              : "Watching live stream. If the host is broadcasting, video will appear here."
          }}
        </div>

        <div class="chatCard">
          <div class="chatHead">
            <div class="chatTitle">💬 Live Chat</div>
          </div>

          <div class="chatList" ref="chatBox">
            <div v-if="chatMessages.length === 0" class="chatEmpty">
              No chat yet. Say hi 👋
            </div>

            <div
              v-for="m in chatMessages"
              :key="m.id"
              class="chatMsg"
            >
              <strong>{{ m.name || "User" }}:</strong>
              <span>{{ m.text }}</span>
            </div>
          </div>

          <div class="chatComposer">
            <input
              v-model="chatDraft"
              class="chatInput"
              placeholder="Write a live message..."
              @keydown.enter="sendChat"
            />
            <button class="primary smallBtn" @click="sendChat" :disabled="!chatDraft.trim()">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket from "../socket.js";

const router = useRouter();
const route = useRoute();

const mode = ref(String(route.query.mode || "lobby"));
const liveId = ref(String(route.query.liveId || ""));
const joinId = ref("");

const localVideoEl = ref(null);
const remoteVideoEl = ref(null);
const chatBox = ref(null);

const viewerCount = ref(0);
const chatDraft = ref("");
const chatMessages = ref([]);

let localStream = null;
let pc = null;
let currentPeerSocketId = null;

const modeLabel = computed(() => {
  if (!liveId.value) return "Lobby";
  return mode.value === "host" ? "Hosting live stream" : "Watching live stream";
});

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function authPayload() {
  const me = getMe();
  return {
    id: String(me?.id || ""),
    username: me?.username || me?.display_name || me?.name || "User",
  };
}

function goBack() {
  router.push("/dashboard");
}

function inviteUrl() {
  return `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId.value)}`;
}

function startHost() {
  const id = `live_${Date.now()}`;
  router.push(`/live?mode=host&liveId=${id}`);
}

function joinWatch() {
  if (!joinId.value.trim()) return;
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(joinId.value.trim())}`);
}

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteUrl());
    alert("Invite link copied");
  } catch {
    alert(inviteUrl());
  }
}

async function shareInvite() {
  const url = inviteUrl();
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Join my Pulse Live",
        text: "Tap to watch my live stream",
        url,
      });
    } else {
      await copyInvite();
    }
  } catch {}
}

async function scrollChatBottom() {
  await nextTick();
  const el = chatBox.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function getTurnConfig() {
  try {
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
    const res = await fetch(`${apiBase}/api/turn`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.iceServers)) return data.iceServers;
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

async function ensureLocalMedia() {
  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (mode.value === "host" && localVideoEl.value) {
    localVideoEl.value.srcObject = localStream;
    await localVideoEl.value.play().catch(() => {});
  }

  return localStream;
}

async function ensurePeerConnection() {
  if (pc) return pc;

  const iceServers = await getTurnConfig();
  pc = new RTCPeerConnection({ iceServers });

  if (mode.value === "host") {
    const stream = await ensureLocalMedia();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (remoteVideoEl.value && stream) {
      remoteVideoEl.value.srcObject = stream;
    }
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate || !liveId.value || !currentPeerSocketId) return;
    socket.emit("live:webrtc:ice", {
      liveId: liveId.value,
      to: currentPeerSocketId,
      candidate: event.candidate,
    });
  };

  return pc;
}

async function makeOffer(targetSocketId) {
  currentPeerSocketId = targetSocketId;
  const peer = await ensurePeerConnection();
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit("live:webrtc:offer", {
    liveId: liveId.value,
    to: targetSocketId,
    offer,
  });
}

function sendChat() {
  const me = getMe();
  if (!chatDraft.value.trim() || !liveId.value) return;

  const payload = {
    id: Date.now(),
    name: me?.username || me?.display_name || me?.name || "User",
    text: chatDraft.value.trim(),
    createdAt: new Date().toISOString(),
  };

  socket.emit("live:chat", {
    liveId: liveId.value,
    message: payload,
  });

  chatDraft.value = "";
}

function stopMedia() {
  try {
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
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
}

function leave() {
  try {
    if (liveId.value) {
      if (mode.value === "host") socket.emit("live:end", { liveId: liveId.value });
      else socket.emit("live:leave", { liveId: liveId.value });
    }
  } catch {}

  stopMedia();
  router.push("/dashboard");
}

function connectSocket() {
  const onConnect = async () => {
    socket.emit("register-user", authPayload());

    if (!liveId.value) return;

    if (mode.value === "host") {
      await ensureLocalMedia();
      socket.emit("live:create", { liveId: liveId.value });
    } else {
      socket.emit("live:join", { liveId: liveId.value });
    }
  };

  const onViewerJoined = async ({ liveId: incomingLiveId, viewerSocketId }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    if (mode.value !== "host") return;
    await makeOffer(viewerSocketId);
  };

  const onOffer = async ({ liveId: incomingLiveId, offer, fromSocketId }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    currentPeerSocketId = fromSocketId;

    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("live:webrtc:answer", {
      liveId: liveId.value,
      to: fromSocketId,
      answer,
    });
  };

  const onAnswer = async ({ liveId: incomingLiveId, answer, fromSocketId }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    currentPeerSocketId = fromSocketId;

    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const onIce = async ({ liveId: incomingLiveId, candidate }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    try {
      const peer = await ensurePeerConnection();
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("live ICE add error:", e);
    }
  };

  const onViewers = ({ liveId: incomingLiveId, viewerCount: count }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    viewerCount.value = Number(count || 0);
  };

  const onChat = async (message) => {
    chatMessages.value.push(message);
    await scrollChatBottom();
  };

  const onEnded = ({ liveId: incomingLiveId }) => {
    if (String(incomingLiveId) !== String(liveId.value)) return;
    alert("Live ended");
    stopMedia();
    router.push("/dashboard");
  };

  socket.on("connect", onConnect);
  socket.on("live:viewer-joined", onViewerJoined);
  socket.on("live:webrtc:offer", onOffer);
  socket.on("live:webrtc:answer", onAnswer);
  socket.on("live:webrtc:ice", onIce);
  socket.on("live:viewers", onViewers);
  socket.on("live:chat", onChat);
  socket.on("live:ended", onEnded);

  if (socket.connected) onConnect();

  return () => {
    socket.off("connect", onConnect);
    socket.off("live:viewer-joined", onViewerJoined);
    socket.off("live:webrtc:offer", onOffer);
    socket.off("live:webrtc:answer", onAnswer);
    socket.off("live:webrtc:ice", onIce);
    socket.off("live:viewers", onViewers);
    socket.off("live:chat", onChat);
    socket.off("live:ended", onEnded);
  };
}

let cleanupSocket = null;

onMounted(() => {
  cleanupSocket = connectSocket();
});

onBeforeUnmount(() => {
  try {
    cleanupSocket?.();
  } catch {}
  stopMedia();
});
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px;color:#fff}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.back,.btn,.danger,.primary{
  border:none;border-radius:999px;padding:12px 16px;color:#fff;font-weight:900
}
.back,.btn{background:rgba(255,255,255,.12)}
.danger{background:rgba(255,82,82,.20);border:1px solid rgba(255,82,82,.28)}
.primary{background:linear-gradient(45deg,#ff416c,#ff4b2b)}
.smallBtn{padding:12px 16px}
.title{font-size:28px;font-weight:950}
.sub{opacity:.75}
.card,.chatCard{
  padding:18px;border-radius:24px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12)
}
.big{font-size:22px;font-weight:950}
.small{opacity:.75;margin-top:6px}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.input{
  flex:1;min-width:220px;padding:12px 14px;border-radius:14px;
  border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:#fff
}
.row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.badge{
  padding:10px 14px;border-radius:999px;background:rgba(255,77,77,.16);
  border:1px solid rgba(255,77,77,.22);font-weight:900
}
.viewerPill{
  padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.12);font-weight:900
}
.meta{opacity:.72;word-break:break-all}
.video{
  width:100%;min-height:300px;max-height:70vh;border-radius:22px;
  background:#000;display:block
}
.notice{margin-top:12px;opacity:.8;line-height:1.5}
.chatCard{margin-top:14px}
.chatHead{margin-bottom:12px}
.chatTitle{font-size:20px;font-weight:900}
.chatList{
  min-height:180px;max-height:260px;overflow:auto;
  border-radius:18px;background:rgba(0,0,0,.22);padding:12px
}
.chatEmpty{opacity:.7}
.chatMsg{margin-bottom:10px;line-height:1.5;word-break:break-word}
.chatComposer{display:flex;gap:10px;margin-top:12px}
.chatInput{
  flex:1;padding:12px 14px;border-radius:14px;
  border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:#fff
}
</style>