<template>
  <div class="people-page">
    <div class="hero">
      <div>
        <h1>People</h1>
        <p>See who is online, open chat, or start audio/video calls.</p>
      </div>

      <button class="refresh-btn" @click="loadPeople" :disabled="loading">
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </div>

    <div class="search-wrap">
      <input
        v-model="search"
        class="search"
        type="text"
        placeholder="Search people..."
      />
    </div>

    <div v-if="incomingCall" class="incoming-call">
      <div class="incoming-title">
        Incoming {{ incomingCall.kind }} call
      </div>
      <div class="incoming-sub">
        From {{ incomingCall.fromName || `User ${incomingCall.fromUserId}` }}
      </div>

      <div class="incoming-actions">
        <button class="accept" @click="acceptIncoming">Accept</button>
        <button class="reject" @click="rejectIncoming">Reject</button>
      </div>
    </div>

    <div class="grid">
      <div
        v-for="person in filteredPeople"
        :key="person.id"
        class="card"
      >
        <div class="avatar">
          {{ initials(person) }}
          <span
            class="status-dot"
            :class="{ online: isOnline(person.id) }"
          ></span>
        </div>

        <div class="meta">
          <div class="name">
            {{ displayName(person) }}
          </div>
          <div class="sub">
            {{ isOnline(person.id) ? "Online" : "Offline" }}
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" @click="openMessages(person)">
            Message
          </button>
          <button
            class="btn"
            @click="startCall(person, 'audio')"
            :disabled="String(person.id) === myUserId"
          >
            Audio
          </button>
          <button
            class="btn video"
            @click="startCall(person, 'video')"
            :disabled="String(person.id) === myUserId"
          >
            Video
          </button>
        </div>
      </div>
    </div>

    <div v-if="!filteredPeople.length" class="empty">
      No people found.
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import socket, { refreshSocketAuth } from "../socket";

const router = useRouter();

const loading = ref(false);
const search = ref("");
const people = ref([]);
const onlineUserIds = ref([]);
const incomingCall = ref(null);

const me = JSON.parse(localStorage.getItem("user") || "{}");
const myUserId = String(me?.id || "");

function displayName(person) {
  return person?.username || person?.display_name || person?.name || `User ${person?.id}`;
}

function initials(person) {
  const n = displayName(person).trim();
  return n.slice(0, 2).toUpperCase();
}

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

const filteredPeople = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return people.value.filter((p) => String(p.id) !== myUserId);

  return people.value.filter((p) => {
    const txt = `${p?.username || ""} ${p?.name || ""} ${p?.display_name || ""} ${p?.email || ""}`.toLowerCase();
    return String(p.id) !== myUserId && txt.includes(q);
  });
});

async function loadPeople() {
  loading.value = true;
  try {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const res = await fetch(`${base}/users`);
    const data = await res.json();

    if (Array.isArray(data)) {
      people.value = data;
    } else if (Array.isArray(data?.users)) {
      people.value = data.users;
    } else {
      people.value = [];
    }
  } catch (err) {
    console.error("Failed loading people:", err);
    people.value = [];
  } finally {
    loading.value = false;
  }
}

function registerPresence() {
  refreshSocketAuth();

  if (!myUserId) return;

  socket.emit("user:online", {
    userId: myUserId,
    username: me?.username || me?.name || `User${myUserId}`,
  });

  socket.emit("presence:get");
}

function openMessages(person) {
  router.push(`/messages?userId=${person.id}&name=${encodeURIComponent(displayName(person))}`);
}

function startCall(person, kind = "audio") {
  if (!person?.id) return;

  socket.emit("call:request", {
    toUserId: String(person.id),
    kind,
  });
}

function acceptIncoming() {
  if (!incomingCall.value?.roomId) return;

  socket.emit("call:accept", {
    roomId: incomingCall.value.roomId,
  });

  router.push(
    `/call?roomId=${encodeURIComponent(incomingCall.value.roomId)}&kind=${encodeURIComponent(incomingCall.value.kind || "audio")}`
  );

  incomingCall.value = null;
}

function rejectIncoming() {
  if (!incomingCall.value?.roomId) return;

  socket.emit("call:reject", {
    roomId: incomingCall.value.roomId,
  });

  incomingCall.value = null;
}

function onPresenceList(payload) {
  onlineUserIds.value = Array.isArray(payload?.onlineUserIds)
    ? payload.onlineUserIds.map(String)
    : [];
}

function onPresenceUpdate(payload) {
  const uid = String(payload?.userId || "");
  if (!uid) return;

  const set = new Set(onlineUserIds.value.map(String));
  if (payload?.online) set.add(uid);
  else set.delete(uid);

  onlineUserIds.value = Array.from(set);
}

function onCallIncoming(payload) {
  incomingCall.value = payload;
}

function onCallAccepted(payload) {
  if (!payload?.roomId) return;
  router.push(
    `/call?roomId=${encodeURIComponent(payload.roomId)}&kind=${encodeURIComponent(payload.kind || "audio")}`
  );
}

function onCallBusy(payload) {
  alert(payload?.message || "User is busy.");
}

function onCallError(payload) {
  alert(payload?.message || "Call error.");
}

onMounted(async () => {
  await loadPeople();
  registerPresence();

  socket.on("presence:list", onPresenceList);
  socket.on("presence:update", onPresenceUpdate);
  socket.on("call:incoming", onCallIncoming);
  socket.on("call:accepted", onCallAccepted);
  socket.on("call:busy", onCallBusy);
  socket.on("call:error", onCallError);
});

onBeforeUnmount(() => {
  socket.off("presence:list", onPresenceList);
  socket.off("presence:update", onPresenceUpdate);
  socket.off("call:incoming", onCallIncoming);
  socket.off("call:accepted", onCallAccepted);
  socket.off("call:busy", onCallBusy);
  socket.off("call:error", onCallError);
});
</script>

<style scoped>
.people-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, #07111f, #0e1f37 40%, #132a49);
  color: white;
}
.hero, .card, .incoming-call {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(14px);
}
.hero {
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.search-wrap { margin-bottom: 16px; }
.search {
  width: 100%;
  padding: 14px 16px;
  border-radius: 18px;
  border: none;
  outline: none;
}
.refresh-btn, .btn, .accept, .reject {
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.card {
  border-radius: 22px;
  padding: 18px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  position: relative;
  margin-bottom: 12px;
}
.status-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6b7280;
  border: 2px solid #07111f;
}
.status-dot.online { background: #22c55e; }
.name { font-weight: 800; font-size: 1.05rem; }
.sub { opacity: 0.8; margin-top: 4px; }
.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.btn { background: white; color: #0f172a; }
.btn.ghost { background: rgba(255,255,255,0.12); color: white; }
.btn.video { background: #22c55e; color: white; }
.incoming-call {
  border-radius: 22px;
  padding: 18px;
  margin-bottom: 16px;
}
.incoming-title { font-size: 1.1rem; font-weight: 800; }
.incoming-sub { margin-top: 6px; opacity: 0.9; }
.incoming-actions { margin-top: 14px; display: flex; gap: 10px; }
.accept { background: #22c55e; color: white; }
.reject { background: #ef4444; color: white; }
.empty { opacity: 0.8; padding: 20px 0; }
</style>