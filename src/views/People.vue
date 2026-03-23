<!-- src/views/People.vue -->
<template>
  <Layout>
    <div class="page">
      <header class="hero">
        <div>
          <h1>People</h1>
          <p>See who is online, open chat, or start a call.</p>
        </div>

        <button class="chip" @click="fetchPeople" :disabled="peopleLoading">
          {{ peopleLoading ? "Refreshing..." : "Refresh" }}
        </button>
      </header>

      <div class="searchWrap">
        <input
          v-model="search"
          class="search"
          type="text"
          placeholder="Search people..."
        />
      </div>

      <div v-if="incomingCall" class="incoming">
        <div class="incomingTitle">
          Incoming {{ incomingCall.kind || "audio" }} call
        </div>
        <div class="incomingSub">
          From {{ incomingCall.fromName || incomingCall.fromUsername || `User ${incomingCall.fromUserId}` }}
        </div>

        <div class="incomingActions">
          <button class="accept" @click="acceptIncoming">Accept</button>
          <button class="reject" @click="rejectIncoming">Reject</button>
        </div>
      </div>

      <div v-if="peopleError" class="errorBox">
        {{ peopleError }}
      </div>

      <div class="grid">
        <div
          v-for="person in filteredPeople"
          :key="person.id"
          class="card"
        >
          <div class="avatar">
            {{ initials(person) }}
            <span class="statusDot" :class="{ online: isOnline(person.id) }"></span>
          </div>

          <div class="meta">
            <div class="name">{{ displayName(person) }}</div>
            <div class="sub">{{ isOnline(person.id) ? "Online" : "Offline" }}</div>
          </div>

          <div class="actions">
            <button class="btn ghost" @click="openMessages(person)">Message</button>
            <button class="btn" @click="startCall(person, 'audio')">Audio</button>
            <button class="btn video" @click="startCall(person, 'video')">Video</button>
          </div>
        </div>
      </div>

      <div v-if="!peopleLoading && !filteredPeople.length" class="empty">
        No people found.
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { refreshSocketAuth } from "../socket";

const router = useRouter();

const apiUrl =
  import.meta.env.VITE_API_URL ||
  "https://addisgo-production-63ae.up.railway.app";

const token = localStorage.getItem("token") || "";
const me = JSON.parse(localStorage.getItem("user") || "{}");
const myUserId = String(me?.id || "");

const people = ref([]);
const peopleLoading = ref(false);
const peopleError = ref("");
const search = ref("");
const onlineUserIds = ref([]);
const incomingCall = ref(null);

function displayName(person) {
  return person?.display_name || person?.username || person?.name || `User ${person?.id}`;
}

function initials(person) {
  return displayName(person).trim().slice(0, 2).toUpperCase();
}

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

const filteredPeople = computed(() => {
  const q = search.value.trim().toLowerCase();

  return people.value
    .filter((p) => String(p.id) !== myUserId)
    .filter((p) => {
      if (!q) return true;
      const hay =
        `${p?.display_name || ""} ${p?.username || ""} ${p?.name || ""} ${p?.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
});

async function fetchPeople() {
  if (!token) {
    peopleError.value = "Please login again.";
    people.value = [];
    return;
  }

  peopleLoading.value = true;
  peopleError.value = "";

  try {
    const res = await fetch(`${apiUrl}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      peopleError.value = data?.error || "Failed to load users";
      people.value = [];
      return;
    }

    people.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.users)
      ? data.users
      : [];
  } catch (err) {
    console.error("fetchPeople error:", err);
    peopleError.value = "Failed to load users";
    people.value = [];
  } finally {
    peopleLoading.value = false;
  }
}

function registerPresence() {
  refreshSocketAuth();

  if (!myUserId) return;

  const username =
    me?.username || me?.display_name || me?.name || me?.email || `User${myUserId}`;

  socket.emit("user:online", { userId: myUserId, username });
  socket.emit("register-user", { id: myUserId, username });
  socket.emit("presence:get");
}

function openMessages(person) {
  router.push(`/messages?userId=${person.id}&name=${encodeURIComponent(displayName(person))}`);
}

function startCall(person, kind = "audio") {
  if (!token) return alert("Login again to call.");
  if (!person?.id) return;
  if (!isOnline(person.id)) return alert("User is offline.");

  socket.emit("call:request", {
    toUserId: String(person.id),
    kind,
  });
}

function acceptIncoming() {
  if (!incomingCall.value?.roomId) return;

  const roomId = String(incomingCall.value.roomId);
  const kind = incomingCall.value.kind || "audio";

  socket.emit("call:accept", { roomId });
  incomingCall.value = null;

  router.push(`/call?roomId=${encodeURIComponent(roomId)}&role=callee&kind=${encodeURIComponent(kind)}`);
}

function rejectIncoming() {
  if (!incomingCall.value?.roomId) return;
  socket.emit("call:reject", { roomId: String(incomingCall.value.roomId) });
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
  onlineUserIds.value = [...set];
}

function onCallIncoming(payload) {
  incomingCall.value = payload;
}

function onCallAccepted(payload) {
  if (!payload?.roomId) return;

  router.push(
    `/call?roomId=${encodeURIComponent(payload.roomId)}&role=caller&kind=${encodeURIComponent(payload.kind || "audio")}`
  );
}

function onCallEnded() {
  incomingCall.value = null;
}

onMounted(async () => {
  await fetchPeople();
  registerPresence();

  socket.on("presence:list", onPresenceList);
  socket.on("presence:update", onPresenceUpdate);
  socket.on("call:incoming", onCallIncoming);
  socket.on("call:accepted", onCallAccepted);
  socket.on("call:ended", onCallEnded);
});

onBeforeUnmount(() => {
  socket.off("presence:list", onPresenceList);
  socket.off("presence:update", onPresenceUpdate);
  socket.off("call:incoming", onCallIncoming);
  socket.off("call:accepted", onCallAccepted);
  socket.off("call:ended", onCallEnded);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 16px;
  background: linear-gradient(180deg, #07111f, #0e1f37 40%, #132a49);
  color: white;
}

.hero,
.card,
.incoming,
.errorBox {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(14px);
}

.hero {
  border-radius: 24px;
  padding: 18px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.hero h1 {
  margin: 0;
  font-size: 1.4rem;
}

.hero p {
  margin: 6px 0 0;
  opacity: 0.8;
}

.chip,
.btn,
.accept,
.reject {
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
}

.searchWrap {
  margin-bottom: 14px;
}

.search {
  width: 100%;
  border: none;
  outline: none;
  border-radius: 18px;
  padding: 14px 16px;
}

.incoming {
  border-radius: 22px;
  padding: 16px;
  margin-bottom: 14px;
}

.incomingTitle {
  font-size: 1.05rem;
  font-weight: 800;
}

.incomingSub {
  margin-top: 6px;
  opacity: 0.9;
}

.incomingActions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.accept {
  background: #22c55e;
  color: white;
}

.reject {
  background: #ef4444;
  color: white;
}

.errorBox {
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 14px;
  color: #ffd4d4;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.card {
  border-radius: 22px;
  padding: 18px;
}

.avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  position: relative;
  margin-bottom: 12px;
}

.statusDot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6b7280;
  border: 2px solid #07111f;
}

.statusDot.online {
  background: #22c55e;
}

.name {
  font-weight: 900;
  font-size: 1.03rem;
}

.sub {
  opacity: 0.78;
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.btn {
  background: white;
  color: #0f172a;
}

.btn.ghost {
  background: rgba(255,255,255,0.12);
  color: white;
}

.btn.video {
  background: #22c55e;
  color: white;
}

.empty {
  opacity: 0.8;
  padding: 18px 4px;
}
</style>