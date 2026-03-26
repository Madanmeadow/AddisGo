<template>
  <Layout>
    <div class="live-page">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>

      <section class="shell glassy">
        <header class="topbar">
          <div>
            <div class="eyebrow">Pulse SFU Beta</div>
            <h1>Live SFU</h1>
            <p>{{ subtitle }}</p>
          </div>

          <div class="top-actions">
            <button type="button" class="chip ghost" @click="goDashboard">Dashboard</button>
            <button
              v-if="isHost && joined"
              type="button"
              class="chip ghost"
              @click="copyJoinLink"
            >
              Copy Join Link
            </button>
            <button
              v-if="isHost && joined"
              type="button"
              class="chip danger"
              @click="endLive"
            >
              End
            </button>
            <button
              v-else-if="joined"
              type="button"
              class="chip"
              @click="leaveLive"
            >
              Leave
            </button>
          </div>
        </header>

        <section v-if="!joined" class="hero grid">
          <div class="card glassy">
            <div class="card-title">Start as Host</div>
            <input v-model.trim="liveIdInput" class="input" placeholder="live-123" />
            <button type="button" class="primary" @click="startAsHost">Start SFU Live</button>
          </div>

          <div class="card glassy">
            <div class="card-title">Join as Viewer</div>
            <input v-model.trim="liveIdInput" class="input" placeholder="live-123" />
            <button type="button" class="primary alt" @click="joinAsViewer">Join SFU Live</button>
          </div>
        </section>

        <section v-if="!joined" class="discover card glassy">
          <div class="discover-head">
            <div class="card-title">Live Now</div>
            <button type="button" class="chip ghost" @click="loadLiveList">Refresh</button>
          </div>

          <div v-if="!sfuLives.length" class="empty">
            No SFU lives yet.
          </div>

          <div v-else class="live-list">
            <article v-for="live in sfuLives" :key="live.liveId" class="live-item">
              <div>
                <div class="live-name">{{ live.liveId }}</div>
                <div class="live-meta">
                  Host: {{ live.hostUsername || "Host" }} •
                  {{ live.audienceCount || 0 }} audience •
                  {{ live.guestCount || 0 }} guests
                </div>
              </div>

              <button type="button" class="chip" @click="joinListedLive(live)">
                Join
              </button>
            </article>
          </div>
        </section>

        <section v-else class="main-grid">
          <div class="stage card glassy">
            <div class="stage-head">
              <div>
                <div class="stage-title">{{ currentLiveId }}</div>
                <div class="stage-sub">
                  {{ isHost ? "Host mode" : "Audience mode" }} •
                  {{ presence.audienceCount }} audience •
                  {{ presence.guestCount }} guests
                </div>
              </div>
              <div class="badge">{{ socketConnected ? "Connected" : "Offline" }}</div>
            </div>

            <div class="video-wrap">
              <video
                v-if="isHost"
                ref="localVideoRef"
                class="video"
                autoplay
                muted
                playsinline
              ></video>

              <video
                v-else
                ref="remoteVideoRef"
                class="video"
                autoplay
                playsinline
              ></video>

              <div class="video-overlay">
                <div class="big">{{ isHost ? "Your Live Preview" : "Stage Viewer" }}</div>
                <div class="small">{{ stageStatus }}</div>
              </div>
            </div>

            <div class="stage-actions">
              <button type="button" class="chip" @click="toggleMic">
                {{ micOn ? "Mic On" : "Mic Off" }}
              </button>
              <button type="button" class="chip" @click="toggleCam">
                {{ camOn ? "Cam On" : "Cam Off" }}
              </button>
              <button type="button" class="chip ghost" @click="copyLiveId">
                Copy Live ID
              </button>
            </div>
          </div>

          <aside class="side">
            <div class="card glassy">
              <div class="card-title">Chat</div>
              <div ref="chatListRef" class="chat-list">
                <div v-if="!chat.length" class="empty">No messages yet.</div>
                <div v-for="(msg, i) in chat" :key="i" class="chat-item">
                  <strong>{{ msg.from?.username || "User" }}:</strong>
                  <span>{{ msg.text }}</span>
                </div>
              </div>

              <div class="chat-compose">
                <input
                  v-model.trim="chatText"
                  class="input"
                  placeholder="Say something..."
                  @keyup.enter="sendChat"
                />
                <button type="button" class="primary" @click="sendChat">Send</button>
              </div>
            </div>

            <div class="card glassy">
              <div class="card-title">Debug</div>
              <div class="debug-line">Role: {{ role }}</div>
              <div class="debug-line">Live: {{ currentLiveId || "—" }}</div>
              <div class="debug-line">Socket: {{ socket.id || "—" }}</div>
              <div class="debug-line">Stage: {{ stageStatus }}</div>
            </div>
          </aside>
        </section>

        <section v-if="error" class="error-card">
          {{ error }}
        </section>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { ensurePulseSocket, refreshSocketAuth } from "../socket";
import { LiveSfuClient } from "../lib/liveSfuClient";

const router = useRouter();
const route = useRoute();

const joined = ref(false);
const role = ref("");
const currentLiveId = ref("");
const liveIdInput = ref("");
const error = ref("");
const chatText = ref("");
const chat = ref([]);
const socketConnected = ref(socket.connected);
const chatListRef = ref(null);
const sfuLives = ref([]);

const presence = ref({
  audienceCount: 0,
  guestCount: 0,
  peerCount: 0,
  hostUserId: "",
  hostUsername: "",
});

const localVideoRef = ref(null);
const remoteVideoRef = ref(null);

const stageStatus = ref("Idle");
const micOn = ref(true);
const camOn = ref(true);
const isHost = ref(false);

const subtitle = "New Mediasoup/SFU live path for Pulse";

let sfu = null;

function makeLiveId() {
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  return `live-${me?.id || "user"}-${Date.now().toString().slice(-6)}`;
}

function setQueryLiveId(liveId) {
  router.replace({
    path: "/live-sfu",
    query: liveId ? { liveId } : {},
  });
}

async function startAsHost() {
  error.value = "";
  const id = String(liveIdInput.value || makeLiveId()).trim();
  liveIdInput.value = id;

  refreshSocketAuth(true);
  ensurePulseSocket();

  socket.emit("sfu:live:create", { liveId: id, title: "Pulse Live" }, async (res) => {
    try {
      if (!res?.ok) throw new Error(res?.error || "Failed to create live");

      currentLiveId.value = id;
      joined.value = true;
      role.value = "host";
      isHost.value = true;
      stageStatus.value = "Creating SFU device...";
      setQueryLiveId(id);

      sfu = new LiveSfuClient();
      await sfu.init(id);

      stageStatus.value = "Starting local media...";
      const stream = await sfu.startHost();

      await nextTick();
      if (localVideoRef.value) {
        localVideoRef.value.srcObject = stream;
      }

      stageStatus.value = "Live and publishing";
      loadLiveList();
    } catch (e) {
      error.value = e?.message || "Failed to start host live";
      stageStatus.value = "Host start failed";
    }
  });
}

async function joinAsViewer() {
  error.value = "";
  const id = String(liveIdInput.value || "").trim();
  if (!id) {
    error.value = "Enter a live id";
    return;
  }

  refreshSocketAuth(true);
  ensurePulseSocket();

  socket.emit("sfu:live:join", { liveId: id }, async (res) => {
    try {
      if (!res?.ok) throw new Error(res?.error || "Failed to join live");

      currentLiveId.value = id;
      joined.value = true;
      role.value = res.role || "audience";
      isHost.value = false;
      stageStatus.value = "Joining audience...";
      setQueryLiveId(id);

      sfu = new LiveSfuClient();
      await sfu.init(id);

      const stream = await sfu.startViewer();

      await nextTick();
      if (remoteVideoRef.value) {
        remoteVideoRef.value.srcObject = stream;
      }

      stageStatus.value = "Connected to live";
      loadLiveList();
    } catch (e) {
      error.value = e?.message || "Failed to join live";
      stageStatus.value = "Join failed";
    }
  });
}

function joinListedLive(live) {
  liveIdInput.value = String(live?.liveId || "");
  joinAsViewer();
}

function sendChat() {
  const text = String(chatText.value || "").trim();
  if (!text || !currentLiveId.value) return;

  socket.emit("sfu:live:chat", {
    liveId: currentLiveId.value,
    text,
  });

  chatText.value = "";
}

function copyLiveId() {
  if (!currentLiveId.value) return;
  navigator.clipboard?.writeText(currentLiveId.value).catch(() => {});
}

function copyJoinLink() {
  if (!currentLiveId.value) return;
  const url = `${window.location.origin}/live-sfu?liveId=${encodeURIComponent(currentLiveId.value)}`;
  navigator.clipboard?.writeText(url).catch(() => {});
}

function resetState() {
  joined.value = false;
  role.value = "";
  isHost.value = false;
  currentLiveId.value = "";
  presence.value = {
    audienceCount: 0,
    guestCount: 0,
    peerCount: 0,
    hostUserId: "",
    hostUsername: "",
  };
  stageStatus.value = "Idle";
  chat.value = [];
  micOn.value = true;
  camOn.value = true;
  setQueryLiveId("");

  try { sfu?.close(); } catch {}
  sfu = null;
}

function leaveLive() {
  if (!currentLiveId.value) {
    resetState();
    router.replace("/dashboard");
    return;
  }

  socket.emit("sfu:live:leave", { liveId: currentLiveId.value }, () => {
    resetState();
    loadLiveList();
    router.replace("/dashboard");
  });
}

function endLive() {
  if (!currentLiveId.value) {
    resetState();
    router.replace("/dashboard");
    return;
  }

  socket.emit("sfu:live:end", { liveId: currentLiveId.value }, () => {
    resetState();
    loadLiveList();
    router.replace("/dashboard");
  });
}

function goDashboard() {
  resetState();
  router.replace("/dashboard");
}

function toggleMic() {
  micOn.value = !micOn.value;
  const track = sfu?.localStream?.getAudioTracks?.()[0];
  if (track) track.enabled = micOn.value;
}

function toggleCam() {
  camOn.value = !camOn.value;
  const track = sfu?.localStream?.getVideoTracks?.()[0];
  if (track) track.enabled = camOn.value;
}

function loadLiveList() {
  socket.emit("sfu:live:list:get", {}, (res) => {
    if (res?.ok) {
      sfuLives.value = Array.isArray(res.lives) ? res.lives : [];
    }
  });
}

function onPresence(payload) {
  presence.value = {
    audienceCount: Number(payload?.audienceCount || 0),
    guestCount: Number(payload?.guestCount || 0),
    peerCount: Number(payload?.peerCount || 0),
    hostUserId: String(payload?.hostUserId || ""),
    hostUsername: payload?.hostUsername || "",
  };
}

function onChat(payload) {
  chat.value.push(payload);
  nextTick(() => {
    if (chatListRef.value) {
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight;
    }
  });
}

function onLiveEnded() {
  resetState();
  loadLiveList();
  router.replace("/dashboard");
}

function onConnect() {
  socketConnected.value = true;
  loadLiveList();
}

function onDisconnect() {
  socketConnected.value = false;
}

function onLiveList(lives) {
  sfuLives.value = Array.isArray(lives) ? lives : [];
}

onMounted(() => {
  ensurePulseSocket();
  refreshSocketAuth(true);

  const qLiveId = String(route.query.liveId || "").trim();
  if (qLiveId) {
    liveIdInput.value = qLiveId;
  }

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("sfu:live:presence", onPresence);
  socket.on("sfu:live:chat", onChat);
  socket.on("sfu:live:ended", onLiveEnded);
  socket.on("sfu:live:list", onLiveList);

  loadLiveList();
});

onBeforeUnmount(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
  socket.off("sfu:live:presence", onPresence);
  socket.off("sfu:live:chat", onChat);
  socket.off("sfu:live:ended", onLiveEnded);
  socket.off("sfu:live:list", onLiveList);

  try { sfu?.close(); } catch {}
  sfu = null;
});
</script>

<style scoped>
.live-page {
  position: relative;
  min-height: 100vh;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(255, 90, 135, 0.16), transparent 25%),
    radial-gradient(circle at top right, rgba(89, 123, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #07111c 0%, #091421 100%);
  color: #f5f7ff;
}

.bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.35;
}

.orb1 {
  width: 260px;
  height: 260px;
  left: -50px;
  top: -50px;
  background: rgba(255, 90, 135, 0.24);
}

.orb2 {
  width: 320px;
  height: 320px;
  right: -100px;
  top: 20%;
  background: rgba(89, 123, 255, 0.24);
}

.glassy {
  background: rgba(14, 20, 34, 0.74);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 18px 44px rgba(0,0,0,0.25);
  backdrop-filter: blur(16px);
}

.shell {
  position: relative;
  z-index: 2;
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9aa8d9;
}

.topbar h1 {
  margin: 6px 0 4px;
  font-size: 30px;
}

.topbar p {
  margin: 0;
  color: #b8c2e6;
}

.top-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.main-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.8fr);
}

.card {
  border-radius: 22px;
  padding: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 12px;
}

.input {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(8, 12, 24, 0.78);
  color: #f4f7ff;
  padding: 0 14px;
  margin-bottom: 12px;
}

.primary,
.chip {
  border: 0;
  outline: none;
  cursor: pointer;
  border-radius: 14px;
  padding: 12px 16px;
  color: #eef3ff;
}

.primary {
  background: linear-gradient(135deg, #ff5f7d, #6f7cff);
  font-weight: 800;
}

.primary.alt {
  background: linear-gradient(135deg, #42d392, #5c9cff);
}

.chip {
  background: rgba(255,255,255,0.08);
}

.chip.ghost {
  background: rgba(255,255,255,0.05);
}

.chip.danger {
  background: linear-gradient(135deg, #ff5f7d, #ff7a59);
}

.discover {
  margin-bottom: 16px;
}

.discover-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.live-list {
  display: grid;
  gap: 12px;
}

.live-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 14px;
  background: rgba(255,255,255,0.05);
}

.live-name {
  font-weight: 800;
}

.live-meta {
  margin-top: 4px;
  color: #b8c2e6;
  font-size: 13px;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.stage-title {
  font-size: 18px;
  font-weight: 800;
}

.stage-sub {
  color: #b8c2e6;
  font-size: 13px;
}

.badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  font-size: 12px;
  font-weight: 800;
}

.video-wrap {
  position: relative;
  overflow: hidden;
  min-height: 420px;
  border-radius: 20px;
  background: #040812;
  border: 1px solid rgba(255,255,255,0.08);
}

.video {
  width: 100%;
  height: 100%;
  min-height: 420px;
  object-fit: cover;
  display: block;
  background: #040812;
}

.video-overlay {
  position: absolute;
  left: 14px;
  bottom: 14px;
  right: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(10px);
}

.big {
  font-weight: 800;
  font-size: 16px;
}

.small {
  margin-top: 4px;
  color: #dbe3ff;
  font-size: 13px;
}

.stage-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.side {
  display: grid;
  gap: 16px;
}

.chat-list {
  height: 300px;
  overflow: auto;
  border-radius: 14px;
  background: rgba(0,0,0,0.18);
  padding: 12px;
  margin-bottom: 12px;
}

.chat-item {
  font-size: 14px;
  margin-bottom: 10px;
  color: #edf2ff;
}

.chat-compose {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.debug-line {
  color: #c8d1ef;
  font-size: 14px;
  margin-bottom: 8px;
}

.error-card {
  margin-top: 16px;
  border-radius: 18px;
  padding: 14px 16px;
  color: #ffd7df;
  background: rgba(120, 15, 35, 0.28);
  border: 1px solid rgba(255, 102, 140, 0.3);
}

.empty {
  color: #aab6dc;
}

@media (max-width: 900px) {
  .grid,
  .main-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .video-wrap,
  .video {
    min-height: 300px;
  }

  .live-item,
  .discover-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>