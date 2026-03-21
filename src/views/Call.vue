<template>
  <Layout>
    <div class="page">
      <div class="head">
        <button class="btn" @click="goBack">← Back</button>
        <div>
          <div class="title">📞 Direct Call</div>
          <div class="sub">{{ displayName }} • {{ kind }}</div>
        </div>
        <button class="danger" @click="endCall">End</button>
      </div>

      <div v-if="!roomId" class="card">
        <div class="big">Missing roomId</div>
        <div class="small">Start the call from People so the app can generate the call room correctly.</div>
      </div>

      <div v-else class="card">
        <div class="metaRow">
          <div class="pill">{{ mode }}</div>
          <div class="pill">{{ kind }}</div>
          <div class="muted">roomId: {{ roomId }}</div>
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

        <div v-else class="audioCard">
          🎧 Audio call ready
        </div>

        <div class="controls">
          <button class="btn" @click="toggleMute">{{ muted ? "Unmute" : "Mute" }}</button>
          <button class="btn" @click="toggleCam" v-if="kind === 'video'">
            {{ camOff ? "Camera On" : "Camera Off" }}
          </button>
        </div>

        <div class="notice">
          This page now opens safely with valid query params.  
          If you want full peer-to-peer media between two users, hook your existing signaling socket events into this page.
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

const roomId = String(route.query.roomId || "");
const kind = String(route.query.kind || "video");
const mode = String(route.query.mode || "caller");
const displayName = String(route.query.name || "User");

const videoEl = ref(null);
const muted = ref(false);
const camOff = ref(false);
let localStream = null;

function goBack() {
  router.push("/people");
}

function endCall() {
  stopTracks();
  router.push("/people");
}

async function startMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: kind === "video",
      audio: true,
    });
    if (videoEl.value && kind === "video") {
      videoEl.value.srcObject = localStream;
      await videoEl.value.play().catch(() => {});
    }
  } catch (e) {
    console.error("call media error:", e);
  }
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

function stopTracks() {
  if (!localStream) return;
  localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
}

onMounted(() => {
  if (roomId) startMedia();
});

onBeforeUnmount(stopTracks);
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px;color:#fff}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.btn,.danger{
  border:none;border-radius:999px;padding:12px 16px;color:#fff;font-weight:900
}
.btn{background:rgba(255,255,255,.12)}
.danger{background:rgba(255,82,82,.18);border:1px solid rgba(255,82,82,.24)}
.title{font-size:28px;font-weight:950}
.sub{opacity:.75}
.card{
  padding:18px;border-radius:24px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12)
}
.big{font-size:22px;font-weight:950}
.small{opacity:.75;margin-top:6px}
.metaRow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.pill{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.10);font-weight:900}
.muted{opacity:.72;word-break:break-all}
.video{width:100%;min-height:320px;background:#000;border-radius:22px}
.audioCard{
  min-height:220px;display:grid;place-items:center;border-radius:22px;background:rgba(0,0,0,.28);
  font-size:28px;font-weight:900
}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.notice{margin-top:14px;opacity:.8;line-height:1.5}
</style>