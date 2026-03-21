<template>
  <Layout>
    <div class="page">
      <div class="head">
        <button class="btn" @click="goBack">← Back</button>
        <div>
          <div class="title">🎧 Room Call</div>
          <div class="sub">{{ roomName }} • {{ kind }}</div>
        </div>
        <button class="danger" @click="leaveRoom">Leave</button>
      </div>

      <div v-if="!roomId" class="card">
        <div class="big">Create or Join a Room</div>
        <div class="actions">
          <button class="primary" @click="createRoom('video')">Start Video Room</button>
          <button class="primary" @click="createRoom('audio')">Start Audio Room</button>
        </div>
      </div>

      <div v-else class="card">
        <div class="metaRow">
          <div class="pill">roomId: {{ roomId }}</div>
          <div class="pill">{{ kind }}</div>
          <div class="pill">{{ roomName }}</div>
        </div>

        <video
          v-if="kind === 'video'"
          ref="videoEl"
          class="video"
          autoplay
          playsinline
          muted
          controls
        ></video>

        <div v-else class="audioCard">🎤 Audio room active</div>

        <div class="notice">
          Room page opens safely now. Add your Socket.io room signaling here if you want live multi-user media.
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const router = useRouter();
const route = useRoute();

const roomId = ref(String(route.query.roomId || ""));
const kind = ref(String(route.query.kind || "video"));
const roomName = ref(String(route.query.name || "Pulse Room"));
const videoEl = ref(null);
let localStream = null;

function goBack() {
  router.push("/dashboard");
}

function leaveRoom() {
  stopTracks();
  router.push("/dashboard");
}

function createRoom(nextKind) {
  const id = `room_${Date.now()}`;
  router.push(`/roomcall?roomId=${id}&kind=${nextKind}&name=${encodeURIComponent("Pulse Room")}`);
}

async function startMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: kind.value === "video",
      audio: true,
    });

    if (videoEl.value && kind.value === "video") {
      videoEl.value.srcObject = localStream;
      await videoEl.value.play().catch(() => {});
    }
  } catch (e) {
    console.error("room media error:", e);
  }
}

function stopTracks() {
  if (!localStream) return;
  localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
}

onMounted(() => {
  if (roomId.value) startMedia();
});

onBeforeUnmount(stopTracks);
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px;color:#fff}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.btn,.danger,.primary{
  border:none;border-radius:999px;padding:12px 16px;color:#fff;font-weight:900
}
.btn{background:rgba(255,255,255,.12)}
.danger{background:rgba(255,82,82,.18);border:1px solid rgba(255,82,82,.24)}
.primary{background:linear-gradient(45deg,#7c4dff,#ff4d6d)}
.title{font-size:28px;font-weight:950}
.sub{opacity:.75}
.card{
  padding:18px;border-radius:24px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12)
}
.big{font-size:22px;font-weight:950}
.actions{display:flex;gap:10px;flex-wrap:wrap}
.metaRow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.pill{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.10);font-weight:900}
.video{width:100%;min-height:320px;background:#000;border-radius:22px}
.audioCard{
  min-height:220px;display:grid;place-items:center;border-radius:22px;background:rgba(0,0,0,.28);
  font-size:28px;font-weight:900
}
.notice{margin-top:14px;opacity:.8;line-height:1.5}
</style>