<template>
  <Teleport to="body">
    <div
      v-if="overlayVisible"
      class="mini-call"
      :style="{ left: `${overlayX}px`, top: `${overlayY}px` }"
    >
      <div
        class="mini-head"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <div class="mini-title">
          <span class="dot"></span>
          <span>{{ partnerName }}</span>
        </div>

        <div class="mini-actions">
          <button class="mini-btn" @click.stop="openCall">Open</button>
          <button class="mini-btn danger" @click.stop="endNow">End</button>
        </div>
      </div>

      <div class="mini-body" @click="openCall">
        <video
          v-show="kind !== 'audio' && hasRemoteVideo"
          ref="remoteVideoEl"
          class="mini-remote"
          autoplay
          playsinline
        ></video>

        <div v-if="kind === 'audio' || !hasRemoteVideo" class="mini-placeholder">
          <div class="avatar">{{ initial }}</div>
          <div class="name">{{ partnerName }}</div>
          <div class="status">{{ statusText }}</div>
        </div>

        <video
          v-show="kind !== 'audio' && hasLocalVideo"
          ref="localVideoEl"
          class="mini-local"
          autoplay
          muted
          playsinline
        ></video>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import { useCallOverlay } from "../../composables/useCallOverlay"

const router = useRouter()

const {
  overlayVisible,
  overlayX,
  overlayY,
  kind,
  partnerName,
  statusText,
  localStream,
  remoteStream,
  expandPath,
  expandQuery,
  expandCall,
  resetOverlay,
} = useCallOverlay()

const localVideoEl = ref(null)
const remoteVideoEl = ref(null)

const initial = computed(() => String(partnerName.value || "U").charAt(0).toUpperCase())

const hasLocalVideo = computed(() => {
  return !!localStream.value?.getVideoTracks?.()?.length
})

const hasRemoteVideo = computed(() => {
  return !!remoteStream.value?.getVideoTracks?.()?.length
})

function bindStreams() {
  if (remoteVideoEl.value && remoteStream.value) {
    remoteVideoEl.value.srcObject = remoteStream.value
    remoteVideoEl.value.play?.().catch(() => {})
  }
  if (localVideoEl.value && localStream.value) {
    localVideoEl.value.srcObject = localStream.value
    localVideoEl.value.play?.().catch(() => {})
  }
}

watch([localStream, remoteStream, overlayVisible], () => {
  bindStreams()
})

onMounted(() => {
  bindStreams()
})

function openCall() {
  expandCall()
  router.push({
    path: expandPath.value || "/call",
    query: expandQuery.value || {},
  })
}

function endNow() {
  window.dispatchEvent(new CustomEvent("pulse:end-call"))
  resetOverlay()
}

let dragging = false
let startX = 0
let startY = 0
let baseX = 0
let baseY = 0

function getPoint(e) {
  if (e.touches?.[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  return { x: e.clientX, y: e.clientY }
}

function startDrag(e) {
  const p = getPoint(e)
  dragging = true
  startX = p.x
  startY = p.y
  baseX = overlayX.value
  baseY = overlayY.value

  window.addEventListener("mousemove", onDrag)
  window.addEventListener("mouseup", stopDrag)
  window.addEventListener("touchmove", onDrag, { passive: false })
  window.addEventListener("touchend", stopDrag)
}

function onDrag(e) {
  if (!dragging) return
  if (e.cancelable) e.preventDefault()

  const p = getPoint(e)
  const nextX = baseX + (p.x - startX)
  const nextY = baseY + (p.y - startY)

  overlayX.value = Math.max(8, Math.min(window.innerWidth - 220, nextX))
  overlayY.value = Math.max(8, Math.min(window.innerHeight - 180, nextY))
}

function stopDrag() {
  dragging = false
  window.removeEventListener("mousemove", onDrag)
  window.removeEventListener("mouseup", stopDrag)
  window.removeEventListener("touchmove", onDrag)
  window.removeEventListener("touchend", stopDrag)
}

onBeforeUnmount(() => {
  stopDrag()
})
</script>

<style scoped>
.mini-call {
  position: fixed;
  z-index: 9999;
  width: 210px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(10, 15, 28, 0.96);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  backdrop-filter: blur(12px);
}

.mini-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 10px 8px;
  cursor: grab;
  background: rgba(255,255,255,0.04);
}

.mini-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: white;
  font-size: 12px;
  font-weight: 800;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #19c46b;
  flex: 0 0 auto;
}

.mini-actions {
  display: flex;
  gap: 6px;
}

.mini-btn {
  border: 0;
  border-radius: 10px;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  color: white;
  background: rgba(255,255,255,0.12);
}

.mini-btn.danger {
  background: linear-gradient(135deg, #ff3d57, #d5153a);
}

.mini-body {
  position: relative;
  width: 210px;
  height: 140px;
  background: #050814;
}

.mini-remote {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-local {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 66px;
  height: 92px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  background: #0d1220;
  transform: scaleX(-1);
}

.mini-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: white;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5478, #617bff);
}

.name {
  font-size: 14px;
  font-weight: 800;
}

.status {
  font-size: 12px;
  opacity: 0.78;
}
</style>