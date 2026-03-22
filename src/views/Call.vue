<template>
  <Layout>
    <div class="call-page">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>

      <header class="topbar glassy">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="title-wrap">
          <h1>📞 Direct Call</h1>
          <p>{{ targetName }} • {{ callType }}</p>
        </div>

        <button class="chip danger" @click="endCall">End</button>
      </header>

      <section v-if="routeError" class="notice error">
        {{ routeError }}
      </section>

      <section v-else class="call-shell">
        <div class="panel glassy local-panel">
          <div class="panel-head">
            <span>You</span>
            <div class="panel-actions">
              <button class="mini" @click="toggleMute">
                {{ isMuted ? "🔇 Muted" : "🎙️ Mic" }}
              </button>
              <button v-if="isVideo" class="mini" @click="toggleCamera">
                {{ isCameraOff ? "📷 Camera Off" : "📸 Camera On" }}
              </button>
            </div>
          </div>

          <div class="media-box">
            <video
              v-if="isVideo"
              ref="localVideoRef"
              autoplay
              playsinline
              muted
              class="video"
            ></video>
            <div v-else class="audio-avatar">{{ myInitials }}</div>
          </div>
        </div>

        <div class="panel glassy remote-panel">
          <div class="panel-head">
            <span>{{ targetName }}</span>
            <div class="status">{{ callStatus }}</div>
          </div>

          <div class="media-box">
            <video
              v-if="isVideo"
              ref="remoteVideoRef"
              autoplay
              playsinline
              class="video"
            ></video>
            <div v-else class="audio-avatar big">{{ targetInitials }}</div>
          </div>
        </div>

        <div class="bottom-bar glassy">
          <button class="control" @click="toggleMute">
            {{ isMuted ? "Unmute" : "Mute" }}
          </button>

          <button v-if="isVideo" class="control" @click="toggleCamera">
            {{ isCameraOff ? "Camera On" : "Camera Off" }}
          </button>

          <button class="control pink" @click="copyRoom">
            Copy Room ID
          </button>

          <button class="control red" @click="endCall">
            End Call
          </button>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "@/components/Layout.vue";
import socket from "@/lib/socket";

const route = useRoute();
const router = useRouter();

const localVideoRef = ref(null);
const remoteVideoRef = ref(null);

const routeError = ref("");
const callStatus = ref("Preparing...");
const isMuted = ref(false);
const isCameraOff = ref(false);

const localStream = ref(null);
const remoteStream = ref(null);
const peerConnection = ref(null);

const currentUser = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

const roomId = computed(() => route.query.roomId ? String(route.query.roomId) : "");
const mode = computed(() => route.query.mode ? String(route.query.mode) : "caller");
const callType = computed(() => route.query.type ? String(route.query.type) : "audio");
const isVideo = computed(() => callType.value === "video");
const targetUserId = computed(() => route.query.targetUserId ? String(route.query.targetUserId) : "");
const targetName = computed(() => route.query.targetName ? String(route.query.targetName) : "Unknown");

const myInitials = computed(() => {
  const raw = currentUser.value?.name || currentUser.value?.username || "Me";
  return raw.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
});

const targetInitials = computed(() => {
  const raw = targetName.value || "U";
  return raw.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
});

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function goBack() {
  router.back();
}

async function copyRoom() {
  try {
    await navigator.clipboard.writeText(roomId.value);
    callStatus.value = "Room ID copied";
  } catch {
    callStatus.value = "Could not copy Room ID";
  }
}

async function getMedia() {
  const constraints = {
    audio: true,
    video: isVideo.value,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  localStream.value = stream;

  await nextTick();

  if (isVideo.value && localVideoRef.value) {
    localVideoRef.value.srcObject = stream;
  }

  return stream;
}

function createPeer() {
  const pc = new RTCPeerConnection(rtcConfig);

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;

    socket.emit("webrtc:ice-candidate", {
      roomId: roomId.value,
      to: targetUserId.value,
      candidate: event.candidate,
    });
  };

  pc.ontrack = (event) => {
    if (!remoteStream.value) {
      remoteStream.value = new MediaStream();
    }

    event.streams[0].getTracks().forEach((track) => {
      const hasTrack = remoteStream.value.getTracks().some((t) => t.id === track.id);
      if (!hasTrack) remoteStream.value.addTrack(track);
    });

    if (isVideo.value && remoteVideoRef.value) {
      remoteVideoRef.value.srcObject = remoteStream.value;
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === "connected") callStatus.value = "Connected";
    else if (state === "connecting") callStatus.value = "Connecting...";
    else if (state === "disconnected") callStatus.value = "Disconnected";
    else if (state === "failed") callStatus.value = "Connection failed";
    else if (state === "closed") callStatus.value = "Call ended";
  };

  peerConnection.value = pc;
  return pc;
}

async function initCall() {
  if (!roomId.value) {
    routeError.value = "Missing roomId. Start the call from People so the app can generate the call room correctly.";
    setTimeout(() => router.push("/people"), 1500);
    return;
  }

  callStatus.value = "Getting media...";
  const stream = await getMedia();
  const pc = createPeer();

  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });

  if (mode.value === "caller") {
    callStatus.value = "Calling...";
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc:offer", {
      roomId: roomId.value,
      to: targetUserId.value,
      offer,
      type: callType.value,
    });
  } else {
    callStatus.value = "Waiting for caller...";
  }
}

function toggleMute() {
  if (!localStream.value) return;
  const audioTracks = localStream.value.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = !track.enabled;
    isMuted.value = !track.enabled;
  });
}

function toggleCamera() {
  if (!localStream.value) return;
  const videoTracks = localStream.value.getVideoTracks();
  videoTracks.forEach((track) => {
    track.enabled = !track.enabled;
    isCameraOff.value = !track.enabled;
  });
}

function cleanup() {
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop());
  }

  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach((track) => track.stop());
  }

  if (peerConnection.value) {
    peerConnection.value.ontrack = null;
    peerConnection.value.onicecandidate = null;
    peerConnection.value.close();
  }

  localStream.value = null;
  remoteStream.value = null;
  peerConnection.value = null;
}

function endCall() {
  socket.emit("call:end", {
    roomId: roomId.value,
    to: targetUserId.value,
  });

  cleanup();
  router.push("/people");
}

onMounted(async () => {
  try {
    await initCall();

    socket.on("webrtc:offer", async ({ roomId: incomingRoomId, from, offer }) => {
      if (String(incomingRoomId) !== roomId.value) return;

      if (!peerConnection.value) {
        const stream = await getMedia();
        const pc = createPeer();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      await peerConnection.value.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.value.createAnswer();
      await peerConnection.value.setLocalDescription(answer);

      socket.emit("webrtc:answer", {
        roomId: roomId.value,
        to: from,
        answer,
      });

      callStatus.value = "Answering...";
    });

    socket.on("webrtc:answer", async ({ roomId: incomingRoomId, answer }) => {
      if (String(incomingRoomId) !== roomId.value || !peerConnection.value) return;
      await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer));
      callStatus.value = "Connected";
    });

    socket.on("webrtc:ice-candidate", async ({ roomId: incomingRoomId, candidate }) => {
      if (String(incomingRoomId) !== roomId.value || !peerConnection.value || !candidate) return;
      try {
        await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    socket.on("call:end", ({ roomId: endedRoomId }) => {
      if (String(endedRoomId) !== roomId.value) return;
      callStatus.value = "Other user ended the call";
      cleanup();
      setTimeout(() => router.push("/people"), 900);
    });
  } catch (err) {
    console.error(err);
    routeError.value =
      err?.message || "Unable to start the call. Check camera/mic permissions.";
  }
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<style scoped>
.call-page {
  min-height: 100vh;
  padding: 18px;
  position: relative;
  color: #fff;
  background:
    radial-gradient(circle at top left, rgba(255, 0, 153, 0.12), transparent 26%),
    radial-gradient(circle at right, rgba(59, 130, 246, 0.14), transparent 30%),
    linear-gradient(180deg, #07111f 0%, #0d1528 100%);
}

.bg {
  position: absolute;
  border-radius: 999px;
  filter: blur(46px);
  opacity: 0.3;
}

.bg1 {
  width: 250px;
  height: 250px;
  left: -60px;
  top: -40px;
  background: #ff2f9e;
}

.bg2 {
  width: 280px;
  height: 280px;
  right: -70px;
  top: 120px;
  background: #2563eb;
}

.glassy {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
}

.topbar,
.notice,
.panel,
.bottom-bar {
  border-radius: 22px;
}

.topbar {
  padding: 16px 18px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-wrap {
  text-align: center;
}

.title-wrap h1 {
  margin: 0;
  font-size: 30px;
}

.title-wrap p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.72);
}

.notice {
  position: relative;
  z-index: 1;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.notice.error {
  background: rgba(255, 90, 90, 0.12);
  border: 1px solid rgba(255, 90, 90, 0.25);
}

.call-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.panel {
  padding: 14px;
  min-height: 360px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status {
  color: rgba(255, 255, 255, 0.72);
}

.media-box {
  height: 300px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.24);
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-avatar {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 30px;
  background: linear-gradient(135deg, #ff2d9c, #7c3aed);
}

.audio-avatar.big {
  width: 130px;
  height: 130px;
  font-size: 38px;
}

.bottom-bar {
  grid-column: 1 / -1;
  padding: 14px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.control,
.chip,
.mini {
  border: none;
  outline: none;
  cursor: pointer;
  color: #fff;
  font-weight: 700;
}

.chip,
.control {
  border-radius: 999px;
  padding: 12px 16px;
}

.mini {
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
}

.chip.ghost,
.control {
  background: rgba(255, 255, 255, 0.08);
}

.chip.danger,
.control.red {
  background: rgba(255, 77, 77, 0.9);
}

.control.pink {
  background: linear-gradient(135deg, #ff2d9c, #7c3aed);
}

@media (max-width: 920px) {
  .call-shell {
    grid-template-columns: 1fr;
  }

  .panel {
    min-height: 280px;
  }

  .media-box {
    height: 240px;
  }
}

@media (max-width: 720px) {
  .call-page {
    padding: 12px;
  }

  .topbar {
    gap: 12px;
    padding: 14px;
  }

  .title-wrap h1 {
    font-size: 24px;
  }
}
</style>