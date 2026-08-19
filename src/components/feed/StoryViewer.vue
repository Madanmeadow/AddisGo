<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  users: { type: Array, required: true },
  startUserId: { type: String, required: true },
  currentUserId: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const flatUsers = computed(() => props.users.filter((u) => u.stories?.length > 0));

const userIndex = ref(Math.max(0, flatUsers.value.findIndex((u) => u.userId === props.startUserId)));
const storyIndex = ref(0);
const progress = ref(0);
const paused = ref(false);

const duration = 5000;
let timer = null;
let startTime = 0;

const currentUser = computed(() => flatUsers.value[userIndex.value]);
const currentStory = computed(() => currentUser.value?.stories?.[storyIndex.value]);

const isImage = computed(() => {
  const s = currentStory.value;
  if (!s) return false;
  return (s.media_type?.startsWith("image") || s.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
});

const isVideo = computed(() => {
  const s = currentStory.value;
  if (!s) return false;
  return (s.media_type?.startsWith("video") || s.media_url?.match(/\.(mp4|webm|mov)$/i));
});

function nextStory() {
  if (!currentUser.value) return;
  if (storyIndex.value < currentUser.value.stories.length - 1) {
    storyIndex.value++;
    resetProgress();
  } else if (userIndex.value < flatUsers.value.length - 1) {
    userIndex.value++;
    storyIndex.value = 0;
    resetProgress();
  } else {
    emit("close");
  }
}

function prevStory() {
  if (storyIndex.value > 0) {
    storyIndex.value--;
    resetProgress();
  } else if (userIndex.value > 0) {
    userIndex.value--;
    storyIndex.value = flatUsers.value[userIndex.value].stories.length - 1;
    resetProgress();
  }
}

function resetProgress() {
  progress.value = 0;
  startTime = Date.now();
}

function startTimer() {
  clearInterval(timer);
  startTime = Date.now();
  timer = setInterval(() => {
    if (paused.value) {
      startTime = Date.now() - (progress.value / 100) * duration;
      return;
    }
    const elapsed = Date.now() - startTime;
    progress.value = Math.min((elapsed / duration) * 100, 100);
    if (progress.value >= 100) {
      clearInterval(timer);
      nextStory();
    }
  }, 50);
}

function onVideoEnded() {
  nextStory();
}

function onKey(e) {
  if (e.key === "Escape") emit("close");
  if (e.key === "ArrowRight") nextStory();
  if (e.key === "ArrowLeft") prevStory();
}

watch(currentStory, () => {
  resetProgress();
  startTimer();
}, { immediate: true });

onMounted(() => {
  window.addEventListener("keydown", onKey);
  startTimer();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  clearInterval(timer);
});
</script>

<template>
  <div class="viewer-overlay" @click.self="emit('close')">
    <div class="viewer-container">
      <!-- Progress bars -->
      <div class="progress-wrap">
        <div
          v-for="(_, i) in currentUser?.stories"
          :key="i"
          class="progress-bg"
        >
          <div
            class="progress-fill"
            :style="{
              width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
            }"
          />
        </div>
      </div>

      <!-- Header -->
      <div class="viewer-header">
        <img
          :src="currentUser?.avatar || '/default-avatar.png'"
          alt=""
          class="header-avatar"
        />
        <span class="header-name">{{ currentUser?.username }}</span>
        <span v-if="currentStory" class="header-time">
          {{ new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <!-- Media -->
      <div
        class="media-wrap"
        @mousedown="paused = true"
        @mouseup="paused = false"
        @touchstart="paused = true"
        @touchend="paused = false"
      >
        <video
          v-if="isVideo"
          :src="currentStory?.media_url"
          class="media"
          autoplay
          muted
          playsinline
          @ended="onVideoEnded"
        />
        <img
          v-else
          :src="currentStory?.media_url"
          alt=""
          class="media"
          draggable="false"
        />

        <div class="tap-left" @click.stop="prevStory" />
        <div class="tap-right" @click.stop="nextStory" />
      </div>

      <!-- Caption -->
      <div v-if="currentStory?.caption" class="caption">
        {{ currentStory.caption }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-container {
  width: 100%;
  max-width: 420px;
  height: 100vh;
  max-height: 800px;
  background: #000;
  position: relative;
  display: flex;
  flex-direction: column;
}

.progress-wrap {
  display: flex;
  gap: 4px;
  padding: 12px 12px 0;
  z-index: 10;
}

.progress-bg {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  transition: width 0.05s linear;
}

.viewer-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  z-index: 10;
}

.header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.header-name {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.header-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-left: auto;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.media-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tap-left,
.tap-right {
  position: absolute;
  top: 0;
  height: 100%;
  width: 35%;
  cursor: pointer;
}

.tap-left {
  left: 0;
}

.tap-right {
  right: 0;
}

.caption {
  color: #fff;
  padding: 16px;
  font-size: 14px;
  text-align: center;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}
</style>