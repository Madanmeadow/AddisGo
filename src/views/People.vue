<template>
  <Layout>
    <div class="people-page">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>

      <header class="topbar glassy">
        <div class="top-left">
          <button class="chip ghost" @click="goBack">← Back</button>

          <div class="title-wrap">
            <h1>People</h1>
            <p>Chat and call your community</p>
          </div>
        </div>

        <div class="top-right">
          <button class="chip" @click="loadUsers" :disabled="loading">
            {{ loading ? "Loading..." : "Refresh" }}
          </button>
        </div>
      </header>

      <section class="toolbar glassy">
        <input
          v-model.trim="search"
          class="search"
          placeholder="Search people..."
        />
      </section>

      <section v-if="error" class="notice error">
        {{ error }}
      </section>

      <section v-if="success" class="notice ok">
        {{ success }}
      </section>

      <section class="people-grid">
        <article
          v-for="person in filteredUsers"
          :key="person.id"
          class="person-card glassy"
        >
          <div class="person-main">
            <div class="avatar">
              <img
                v-if="person.avatar_url || person.profile_picture"
                :src="person.avatar_url || person.profile_picture"
                :alt="person.name || person.username || 'User'"
              />
              <span v-else>
                {{ getInitials(person) }}
              </span>
            </div>

            <div class="meta">
              <div class="name">
                {{ person.name || person.username || `User ${person.id}` }}
              </div>
              <div class="sub">
                @{{ person.username || `user${person.id}` }}
              </div>
              <div class="status-row">
                <span
                  class="dot"
                  :class="{ on: isOnline(person.id), off: !isOnline(person.id) }"
                ></span>
                <span>{{ isOnline(person.id) ? "Online" : "Offline" }}</span>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" @click="openChat(person)" :disabled="workingUserId === person.id">
              {{ workingUserId === person.id ? "Opening..." : "Message" }}
            </button>

            <button class="btn soft" @click="startCall(person, 'audio')" :disabled="workingUserId === person.id">
              Audio
            </button>

            <button class="btn soft" @click="startCall(person, 'video')" :disabled="workingUserId === person.id">
              Video
            </button>
          </div>
        </article>

        <div v-if="!loading && filteredUsers.length === 0" class="empty glassy">
          No people found.
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const users = ref([]);
const loading = ref(false);
const error = ref("");
const success = ref("");
const search = ref("");
const workingUserId = ref(null);
const onlineUserIds = ref([]);

const currentUser = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase();
  return users.value.filter((u) => {
    if (!u || String(u.id) === String(currentUser.value?.id)) return false;
    const hay =
      `${u.name || ""} ${u.username || ""} ${u.email || ""}`.toLowerCase();
    return hay.includes(q);
  });
});

function goBack() {
  router.back();
}

function getInitials(person) {
  const raw = person?.name || person?.username || "U";
  return raw
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isOnline(userId) {
  return onlineUserIds.value.map(String).includes(String(userId));
}

async function loadUsers() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get("/users");
    users.value = Array.isArray(data) ? data : data.users || [];
  } catch (err) {
    error.value =
      err?.response?.data?.message || "Failed to load people.";
  } finally {
    loading.value = false;
  }
}

async function findOrCreateConversation(otherUserId) {
  const { data } = await api.get("/conversations/find-or-create", {
    params: { userId: otherUserId },
  });

  const conversationId =
    data?.conversationId || data?.id || data?.conversation?.id;

  if (!conversationId) {
    throw new Error("Conversation could not be created.");
  }

  return String(conversationId);
}

async function openChat(person) {
  workingUserId.value = person.id;
  error.value = "";
  success.value = "";

  try {
    const conversationId = await findOrCreateConversation(person.id);

    router.push({
      path: "/messages",
      query: {
        conversationId,
        userId: String(person.id),
        name: person.name || person.username || "User",
      },
    });
  } catch (err) {
    error.value = err?.message || "Unable to open chat.";
  } finally {
    workingUserId.value = null;
  }
}

function makeRoomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function startCall(person, type = "audio") {
  workingUserId.value = person.id;
  error.value = "";
  success.value = "";

  try {
    const conversationId = await findOrCreateConversation(person.id);
    const roomId = makeRoomId();

    socket.emit("call:invite", {
      toUserId: String(person.id),
      fromUserId: String(currentUser.value?.id),
      fromName: currentUser.value?.name || currentUser.value?.username || "Unknown",
      roomId,
      conversationId,
      type,
    });

    router.push({
      path: "/call",
      query: {
        roomId,
        mode: "caller",
        type,
        targetUserId: String(person.id),
        targetName: person.name || person.username || "User",
        conversationId,
      },
    });
  } catch (err) {
    error.value = err?.message || "Unable to start call.";
  } finally {
    workingUserId.value = null;
  }
}

onMounted(() => {
  loadUsers();

  socket.emit("presence:sync");

  socket.on("presence:list", ({ onlineUserIds: ids }) => {
    onlineUserIds.value = Array.isArray(ids) ? ids : [];
  });

  socket.on("presence:update", ({ userId, online }) => {
    const set = new Set(onlineUserIds.value.map(String));
    if (online) set.add(String(userId));
    else set.delete(String(userId));
    onlineUserIds.value = [...set];
  });

  socket.on("call:declined", ({ roomId }) => {
    success.value = `Call declined${roomId ? ` (${roomId.slice(0, 6)})` : ""}.`;
  });
});
</script>

<style scoped>
.people-page {
  position: relative;
  min-height: 100vh;
  padding: 18px;
  color: #fff;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 0, 140, 0.14), transparent 30%),
    radial-gradient(circle at bottom right, rgba(0, 162, 255, 0.16), transparent 30%),
    linear-gradient(180deg, #07111f 0%, #0b1324 45%, #0d152a 100%);
}

.bg {
  position: absolute;
  border-radius: 999px;
  filter: blur(50px);
  opacity: 0.35;
  pointer-events: none;
}

.bg1 {
  width: 260px;
  height: 260px;
  top: -50px;
  left: -70px;
  background: #ff4ecd;
}

.bg2 {
  width: 280px;
  height: 280px;
  right: -80px;
  top: 120px;
  background: #3b82f6;
}

.bg3 {
  width: 240px;
  height: 240px;
  bottom: -70px;
  left: 20%;
  background: #7c3aed;
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
.toolbar,
.person-card,
.empty,
.notice {
  border-radius: 22px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  margin-bottom: 14px;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title-wrap h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1;
}

.title-wrap p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.72);
}

.toolbar {
  padding: 14px;
  margin-bottom: 14px;
}

.search {
  width: 100%;
  border: none;
  outline: none;
  border-radius: 16px;
  padding: 14px 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.search::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.people-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.person-card {
  padding: 16px;
}

.person-main {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 20px;
  background: linear-gradient(135deg, rgba(255, 0, 132, 0.35), rgba(59, 130, 246, 0.35));
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  min-width: 0;
}

.name {
  font-size: 18px;
  font-weight: 800;
}

.sub {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.68);
}

.status-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.dot.on {
  background: #22c55e;
  box-shadow: 0 0 14px #22c55e;
}

.dot.off {
  background: rgba(255, 255, 255, 0.3);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn,
.chip {
  border: none;
  outline: none;
  cursor: pointer;
  color: #fff;
  font-weight: 700;
  transition: 0.2s ease;
}

.btn {
  border-radius: 14px;
  padding: 12px 14px;
}

.chip {
  border-radius: 999px;
  padding: 12px 16px;
}

.primary {
  background: linear-gradient(135deg, #ff2c9c, #7c3aed);
}

.soft {
  background: rgba(255, 255, 255, 0.1);
}

.ghost {
  background: rgba(255, 255, 255, 0.08);
}

.btn:hover,
.chip:hover {
  transform: translateY(-1px);
}

.notice {
  position: relative;
  z-index: 1;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.notice.error {
  background: rgba(255, 70, 70, 0.12);
  border: 1px solid rgba(255, 90, 90, 0.25);
}

.notice.ok {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.empty {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
}

@media (max-width: 720px) {
  .people-page {
    padding: 12px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .top-left,
  .top-right {
    width: 100%;
  }

  .title-wrap h1 {
    font-size: 24px;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>