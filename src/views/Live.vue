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
          <input v-model="joinId" class="input" placeholder="Enter liveId to watch..." />
          <button class="btn" @click="joinWatch">Watch</button>
        </div>
      </div>

      <div v-else class="card">
        <div class="row">
          <div class="badge">{{ mode === 'host' ? 'HOSTING' : 'WATCHING' }}</div>
          <div class="meta">liveId: {{ liveId }}</div>
        </div>

        <video
          ref="videoEl"
          class="video"
          autoplay
          playsinline
          muted
          controls
        ></video>

        <div class="notice">
          {{ mode === "host"
            ? "Your local camera preview is running. Share this liveId with viewers."
            : "Watcher mode is open. If your signaling layer is connected, remote video can attach here." }}
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const router = useRouter();
const route = useRoute();

const mode = ref(String(route.query.mode || "lobby"));
const liveId = ref(String(route.query.liveId || ""));
const joinId = ref("");
const videoEl = ref(null);
let localStream = null;

const modeLabel = computed(() => {
  if (!liveId.value) return "Lobby";
  return mode.value === "host" ? "Hosting live stream" : "Watching live stream";
});

function goBack() {
  router.push("/dashboard");
}

function leave() {
  stopMedia();
  router.push("/dashboard");
}

function startHost() {
  const id = `live_${Date.now()}`;
  router.push(`/live?mode=host&liveId=${id}`);
}

function joinWatch() {
  if (!joinId.value.trim()) return;
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(joinId.value.trim())}`);
}

async function startLocalPreview() {
  if (mode.value !== "host" || !videoEl.value) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoEl.value.srcObject = localStream;
    await videoEl.value.play().catch(() => {});
  } catch (e) {
    console.error("live local preview error:", e);
  }
}

function stopMedia() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
}

onMounted(() => {
  if (liveId.value && mode.value === "host") startLocalPreview();
});

onBeforeUnmount(() => {
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
.title{font-size:28px;font-weight:950}
.sub{opacity:.75}
.card{
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
.badge{
  padding:10px 14px;border-radius:999px;background:rgba(255,77,77,.16);
  border:1px solid rgba(255,77,77,.22);font-weight:900
}
.meta{opacity:.72;word-break:break-all}
.video{
  width:100%;min-height:300px;max-height:70vh;border-radius:22px;
  background:#000;display:block
}
.notice{margin-top:12px;opacity:.8;line-height:1.5}
</style>