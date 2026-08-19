<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { fetchStories } from "@/api/stories.js";
import StoryViewer from "./StoryViewer.vue";

const props = defineProps({
  currentUser: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["create"]);

const stories = ref([]);
const grouped = ref([]);
const viewingUserId = ref(null);
let interval = null;

const currentUserId = computed(() => String(props.currentUser?.id || props.currentUser?.userId || ""));

const myGroup = computed(() => grouped.value.find((g) => g.userId === currentUserId.value));
const others = computed(() => grouped.value.filter((g) => g.userId !== currentUserId.value));

function avatarFallback(name) {
  const n = encodeURIComponent(name || "User");
  return `https://ui-avatars.com/api/?name=${n}&background=random&color=fff`;
}

async function load() {
  try {
    const data = await fetchStories();
    stories.value = data;

    const map = new Map();
    for (const s of data) {
      const uid = String(s.user_id);
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          username: s.username || s.display_name || s.name || `User ${uid}`,
          avatar: s.avatar_url || avatarFallback(s.username || s.display_name || s.name || `User ${uid}`),
          stories: [],
        });
      }
      map.get(uid).stories.push(s);
    }
    grouped.value = Array.from(map.values());
  } catch (e) {
    console.error("Stories load error:", e);
  }
}

function handleMyClick() {
  if (myGroup.value) {
    viewingUserId.value = currentUserId.value;
  } else {
    emit("create");
  }
}

onMounted(() => {
  load();
  interval = setInterval(load, 30000);
});

onUnmounted(() => {
  clearInterval(interval);
});
</script>

<template>
  <div class="stories-bar">
    <!-- My story -->
    <div class="story-item" @click="handleMyClick">
      <div class="story-ring" :class="{ active: myGroup, add: !myGroup }">
        <img
          :src="currentUser?.avatar_url || avatarFallback(currentUser?.username || currentUser?.display_name || 'Me')"
          alt="me"
          class="story-avatar"
          @error="$event.target.src = avatarFallback('Me')"
        />
      </div>
      <span class="story-label">{{ myGroup ? "Your story" : "Add story" }}</span>
      <div v-if="!myGroup" class="story-plus">+</div>
    </div>

    <!-- Other users -->
    <div
      v-for="user in others"
      :key="user.userId"
      class="story-item"
      @click="viewingUserId = user.userId"
    >
      <div class="story-ring active">
        <img
          :src="user.avatar || avatarFallback(user.username)"
          :alt="user.username"
          class="story-avatar"
          @error="$event.target.src = avatarFallback(user.username)"
        />
      </div>
      <span class="story-label">{{ user.username }}</span>
    </div>

    <!-- Viewer -->
    <StoryViewer
      v-if="viewingUserId"
      :users="grouped"
      :start-user-id="viewingUserId"
      :current-user-id="currentUserId"
      @close="viewingUserId = null"
    />
  </div>
</template>

<style scoped>
.stories-bar {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  overflow-x: auto;
  border-bottom: 1px solid #333;
  background: #0a0a0a;
  align-items: flex-start;
}

.story-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  min-width: 72px;
  position: relative;
  flex-shrink: 0;
}

.story-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-ring.add {
  border: 2px dashed #555;
}

.story-ring.active {
  border: 2px solid #f97316;
  background: linear-gradient(45deg, #f97316, #ec4899);
}

.story-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #0a0a0a;
  background: #1a1a1a;
}

.story-label {
  color: #ccc;
  font-size: 11px;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-plus {
  position: absolute;
  bottom: 18px;
  right: 4px;
  background: #3b82f6;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid #0a0a0a;
}
</style>