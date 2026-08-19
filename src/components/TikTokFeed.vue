<template>
  <div>
    <StoriesBar
      :current-user="currentUser"
      @create="showUploadModal = true"
    />
    <section class="tt-feed">
      <article
        v-for="item in normalizedItems"
        :key="`tt-${mode}-${item.id}`"
        class="tt-card"
        :class="[modeClass, { active: activeId === item.id }]"
        :id="`post-${item.id}`"
        :data-active-id="item.id"
      >
        <div class="tt-shell">
          <div class="tt-video-wrap">
            <!-- VIDEO -->
            <template v-if="item.video_url">
              <video
                :ref="(el) => setVideoRef(item.id, el)"
                class="tt-video"
                :data-post-id="item.id"
                :src="safeMedia(item.video_url)"
                playsinline
                webkit-playsinline
                preload="metadata"
                loop
                :muted="globalMuted"
                :poster="item.poster_url ? safeMedia(item.poster_url) : ''"
                @click="togglePlay(item.id)"
                @loadedmetadata="onLoadedMeta(item.id, $event)"
                @loadeddata="onLoadedData(item.id)"
                @canplay="onCanPlay(item.id)"
                @play="onPlay(item.id)"
                @pause="onPause(item.id)"
                @error="onMediaError(item.id, 'video')"
              ></video>

              <div v-if="mediaState[item.id]?.loading" class="tt-loading">
                <div class="tt-spinner"></div>
                <div class="tt-loading-text">Loading video…</div>
              </div>

              <div v-if="mediaState[item.id]?.error" class="tt-fallback">
                <div class="tt-fallback-icon">🎬</div>
                <div class="tt-fallback-title">Video unavailable</div>
                <div class="tt-fallback-sub">Tap Share or refresh the feed.</div>
              </div>
            </template>

            <!-- IMAGE -->
            <template v-else-if="item.image_url">
              <img
                class="tt-image"
                :src="safeMedia(item.image_url)"
                loading="lazy"
                :alt="item.caption || 'post media'"
                @load="onImageLoaded(item.id)"
                @error="onMediaError(item.id, 'image')"
              />

              <div v-if="mediaState[item.id]?.error" class="tt-fallback">
                <div class="tt-fallback-icon">🖼️</div>
                <div class="tt-fallback-title">Image unavailable</div>
                <div class="tt-fallback-sub">This media could not load after deployment.</div>
              </div>
            </template>

            <!-- TEXT ONLY -->
            <div v-else class="tt-empty">
              <div class="tt-empty-icon">✨</div>
              <div class="tt-empty-title">No media</div>
              <div class="tt-empty-sub">This post has text only.</div>
            </div>

            <!-- TOP OVERLAY -->
            <div class="tt-overlay top">
              <div class="tt-top-left">
                <div class="tt-badge liveish">
                  {{ mode === "reels" ? "REELS" : "FOR YOU" }}
                </div>

                <div v-if="item.video_url && durationText(item.id)" class="tt-badge soft">
                  {{ durationText(item.id) }}
                </div>

                <div
                  v-if="item.video_url && mediaState[item.id]?.ready"
                  class="tt-badge soft"
                >
                  {{ playingMap[item.id] ? "Playing" : "Paused" }}
                </div>
              </div>

              <button
                v-if="item.video_url"
                class="tt-top-btn"
                type="button"
                @click.stop="$emit('toggle-muted')"
              >
                {{ globalMuted ? "🔇" : "🔊" }}
              </button>
            </div>

            <!-- CENTER PLAY/PAUSE -->
            <div
              v-if="item.video_url"
              class="tt-center"
              :class="{ show: showCenterIconId === item.id }"
            >
              <div class="tt-center-icon">
                {{ playingMap[item.id] ? "⏸" : "▶" }}
              </div>
            </div>

            <!-- BOTTOM OVERLAY -->
            <div class="tt-overlay bottom">
              <div class="tt-meta">
                <div class="tt-user-row">
                  <div class="tt-avatar">
                    {{ userInitial(item) }}
                  </div>

                  <div class="tt-user-meta">
                    <div class="tt-name-row">
                      <div class="tt-username">{{ displayName(item) }}</div>
                      <span class="tt-dot">•</span>
                      <div class="tt-time">{{ safeDate(item.created_at) }}</div>
                    </div>

                    <div class="tt-mode-line">
                      {{ mode === "reels" ? "Short video" : "Auto-playing video" }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="item.caption"
                  class="tt-caption"
                  :class="{ expanded: expandedCaptions[item.id] }"
                >
                  <span>{{ item.caption }}</span>

                  <button
                    v-if="needsExpand(item.caption)"
                    class="tt-more"
                    type="button"
                    @click.stop="toggleCaption(item.id)"
                  >
                    {{ expandedCaptions[item.id] ? "less" : "more" }}
                  </button>
                </div>
              </div>

              <div class="tt-actions">
                <button class="tt-action" type="button" @click.stop="$emit('like', item)">
                  <span class="tt-action-icon">❤️</span>
                  <span class="tt-action-label">{{ safeLikes(item) }}</span>
                </button>

                <button class="tt-action" type="button" @click.stop="$emit('comments', item)">
                  <span class="tt-action-icon">💬</span>
                  <span class="tt-action-label">{{ safeComments(item) }}</span>
                </button>

                <button class="tt-action" type="button" @click.stop="$emit('share', item)">
                  <span class="tt-action-icon">🔗</span>
                  <span class="tt-action-label">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div v-if="canLoadMore" ref="sentinelRef" class="tt-load-more">
        {{ loadingMore ? "Loading more…" : "Keep scrolling…" }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue"
import StoriesBar from "./feed/StoriesBar.vue"

const props = defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: "foryou" },
  globalMuted: { type: Boolean, default: true },
  canLoadMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },

  getMedia: {
    type: Function,
    default: (url) => url || "",
  },
  formatDate: {
    type: Function,
    default: (d) => {
      if (!d) return ""
      const dt = new Date(d)
      return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleString()
    },
  },
  getInitial: {
    type: Function,
    default: (item) => {
      if (typeof item === "object" && item) {
        const raw =
          item.display_name ||
          item.username ||
          item.name ||
          item.user_id ||
          item.id ||
          "U"
        return String(raw).trim().charAt(0).toUpperCase() || "U"
      }
      return String(item || "U").trim().charAt(0).toUpperCase() || "U"
    },
  },
  likesCount: {
    type: Function,
    default: () => 0,
  },
  commentCount: {
    type: Function,
    default: () => 0,
  },
})

const emit = defineEmits([
  "toggle-muted",
  "load-more",
  "like",
  "comments",
  "share",
])

const currentUser = ref(JSON.parse(localStorage.getItem("user") || "{}"))
const showUploadModal = ref(false)

const sentinelRef = ref(null)
let loadObserver = null
let activeObserver = null

const activeId = ref(null)
const expandedCaptions = ref({})
const playingMap = ref({})
const durationMap = ref({})
const showCenterIconId = ref(null)
const mediaState = ref({})
const videoRefs = new Map()

let centerTimer = null

const modeClass = computed(() => {
  return props.mode === "reels" ? "is-reels" : "is-foryou"
})

const normalizedItems = computed(() => {
  return (props.items || [])
    .filter(Boolean)
    .map((item) => ({
      id: Number(item.id),
      user_id: item.user_id ?? 0,
      display_name: item.display_name ?? "",
      username: item.username ?? "",
      caption: item.caption ?? "",
      image_url: item.image_url ?? null,
      video_url: item.video_url ?? null,
      poster_url: item.poster_url ?? item.thumbnail_url ?? null,
      created_at: item.created_at ?? new Date().toISOString(),
      raw: item,
    }))
    .filter((item) => item.id)
})

function displayName(item) {
  return item.display_name || item.username || `User #${item.user_id || "?"}`}

function userInitial(item) {
  try {
    return props.getInitial(item.raw || item)
  } catch {
    return String(displayName(item)).trim().charAt(0).toUpperCase() || "U"
  }
}

function safeMedia(url) {
  try {
    return props.getMedia(url)
  } catch {
    return url || ""
  }
}

function safeDate(value) {
  try {
    return props.formatDate(value)
  } catch {
    if (!value) return ""
    const dt = new Date(value)
    return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleString()
  }
}

function safeLikes(item) {
  try {
    return props.likesCount(item.raw || item) ?? 0
  } catch {
    return 0
  }
}

function safeComments(item) {
  try {
    return props.commentCount(item.raw || item) ?? 0
  } catch {
    return 0
  }
}

function needsExpand(text) {
  return String(text || "").length > 110
}

function toggleCaption(id) {
  expandedCaptions.value = {
    ...expandedCaptions.value,
    [id]: !expandedCaptions.value[id],
  }
}

function setVideoRef(id, el) {
  const key = Number(id)
  if (!key) return

  if (el) {
    videoRefs.set(key, el)
    el.muted = props.globalMuted
  } else {
    videoRefs.delete(key)
  }
}

function setMediaPatch(id, patch) {
  mediaState.value = {
    ...mediaState.value,
    [id]: {
      loading: false,
      ready: false,
      error: false,
      ...(mediaState.value[id] || {}),
      ...patch,
    },
  }
}

function onLoadedMeta(id, event) {
  const duration = Number(event?.target?.duration || 0)
  if (!duration || Number.isNaN(duration)) return

  durationMap.value = {
    ...durationMap.value,
    [id]: duration,
  }
}

function onLoadedData(id) {
  setMediaPatch(id, { loading: false, ready: true, error: false })
}

function onCanPlay(id) {
  setMediaPatch(id, { loading: false, ready: true, error: false })
}

function onImageLoaded(id) {
  setMediaPatch(id, { loading: false, ready: true, error: false })
}

function onMediaError(id, type) {
  console.error(`Media failed for ${type} post ${id}`)
  setMediaPatch(id, { loading: false, ready: false, error: true })
}

function durationText(id) {
  const duration = durationMap.value[id]
  if (!duration) return ""

  const total = Math.floor(duration)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

function flashCenterIcon(id) {
  showCenterIconId.value = id
  if (centerTimer) clearTimeout(centerTimer)
  centerTimer = setTimeout(() => {
    showCenterIconId.value = null
  }, 650)
}

function togglePlay(id) {
  const el = videoRefs.get(Number(id))
  if (!el) return

  if (el.paused) {
    el.play?.().catch(() => {})
  } else {
    el.pause?.()
  }
  flashCenterIcon(id)
}

function onPlay(id) {
  playingMap.value = {
    ...playingMap.value,
    [id]: true,
  }
}

function onPause(id) {
  playingMap.value = {
    ...playingMap.value,
    [id]: false,
  }
}

function pauseAllExcept(activePostId) {
  for (const [id, el] of videoRefs.entries()) {
    if (!el) continue
    if (Number(id) !== Number(activePostId)) {
      try {
        el.pause()
      } catch {}
    }
  }
}

async function tryPlayActive(id) {
  const el = videoRefs.get(Number(id))
  if (!el) return

  el.muted = props.globalMuted
  setMediaPatch(id, { loading: true, error: false })

  try {
    await el.play()
    setMediaPatch(id, { loading: false, ready: true, error: false })
  } catch (err) {
    // autoplay may fail after deployment / navigation / browser policy
    console.warn("Autoplay blocked or failed for", id, err)
    setMediaPatch(id, { loading: false, ready: true, error: false })
  }
}

function setupLoadObserver() {
  try {
    loadObserver?.disconnect()
  } catch {}

  if (!sentinelRef.value) return

  loadObserver = new IntersectionObserver(
    (entries) => {
      const hit = entries.some((e) => e.isIntersecting)
      if (hit && props.canLoadMore && !props.loadingMore) {
        emit("load-more")
      }
    },
    { threshold: 0.15 }
  )

  loadObserver.observe(sentinelRef.value)
}

function setupActiveObserver() {
  try {
    activeObserver?.disconnect()
  } catch {}

  activeObserver = new IntersectionObserver(
    async (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))

      if (!visible.length) return

      const card = visible[0].target
      const id = Number(card.getAttribute("data-active-id") || 0)
      if (!id) return

      activeId.value = id
      pauseAllExcept(id)
      await tryPlayActive(id)
    },
    { threshold: [0.35, 0.6, 0.85] }
  )

  nextTick(() => {
    document.querySelectorAll(".tt-card[data-active-id]").forEach((card) => {
      activeObserver?.observe(card)
    })
  })
}

function syncMutedToVideos() {
  for (const [, el] of videoRefs.entries()) {
    if (!el) continue
    el.muted = props.globalMuted
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible" && activeId.value) {
    tryPlayActive(activeId.value)
  } else {
    pauseAllExcept(-1)
  }
}

watch(
  () => props.items,
  async (items) => {
    const nextState = {}
    for (const item of items || []) {
      if (!item?.id) continue
      nextState[item.id] = mediaState.value[item.id] || {
        loading: !!item.video_url,
        ready: false,
        error: false,
      }
    }
    mediaState.value = nextState

    await nextTick()
    setupLoadObserver()
    setupActiveObserver()
    syncMutedToVideos()

    if (activeId.value) {
      pauseAllExcept(activeId.value)
    }
  },
  { deep: true, immediate: true }
)

watch(
  () => props.globalMuted,
  () => {
    syncMutedToVideos()
  }
)

onMounted(async () => {
  await nextTick()
  setupLoadObserver()
  setupActiveObserver()
  syncMutedToVideos()
  document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
  try {
    loadObserver?.disconnect()
  } catch {}

  try {
    activeObserver?.disconnect()
  } catch {}

  if (centerTimer) clearTimeout(centerTimer)
  document.removeEventListener("visibilitychange", handleVisibilityChange)

  for (const [, el] of videoRefs.entries()) {
    try { el.pause() } catch {}
  }
  videoRefs.clear()
})
</script>

<style scoped>
.tt-feed {
  display: grid;
  gap: 16px;
}

.tt-card {
  position: relative;
  scroll-snap-align: start;
  scroll-margin-top: 130px;
}

.tt-shell {
  position: relative;
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 16px 44px rgba(0,0,0,0.32),
    inset 0 1px 0 rgba(255,255,255,0.04);
  backdrop-filter: blur(14px);
}

.tt-card.active .tt-shell {
  box-shadow:
    0 18px 54px rgba(0,0,0,0.40),
    0 0 0 1px rgba(255,255,255,0.06),
    0 0 28px rgba(255,75,43,0.10);
}

.tt-video-wrap {
  position: relative;
  min-height: 76vh;
  background:
    radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06), transparent 28%),
    #050814;
}

.is-reels .tt-video-wrap {
  min-height: 78vh;
}

.tt-video,
.tt-image {
  width: 100%;
  height: 76vh;
  display: block;
  object-fit: cover;
  background: #000;
}

.is-reels .tt-video,
.is-reels .tt-image {
  height: 78vh;
}

.tt-loading,
.tt-fallback,
.tt-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
}

.tt-loading {
  background: rgba(0,0,0,0.28);
  z-index: 2;
}

.tt-spinner {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(255,255,255,0.18);
  border-top-color: rgba(255,255,255,0.88);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tt-loading-text {
  font-size: 13px;
  opacity: 0.82;
}

.tt-fallback {
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 26%),
    linear-gradient(180deg, rgba(10,14,20,0.72), rgba(5,8,20,0.88));
  z-index: 2;
}

.tt-fallback-icon,
.tt-empty-icon {
  font-size: 36px;
}

.tt-fallback-title,
.tt-empty-title {
  font-size: 18px;
  font-weight: 900;
}

.tt-fallback-sub,
.tt-empty-sub {
  font-size: 13px;
  opacity: 0.72;
  max-width: 280px;
}

.tt-empty {
  height: 76vh;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 26%),
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
}

.tt-overlay {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  z-index: 3;
  pointer-events: none;
}

.tt-overlay.top {
  top: 0;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px;
}

.tt-overlay.bottom {
  bottom: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background:
    linear-gradient(180deg, transparent, rgba(0,0,0,0.10) 15%, rgba(0,0,0,0.56) 62%, rgba(0,0,0,0.78));
}

.tt-top-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.tt-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  backdrop-filter: blur(10px);
}

.tt-badge.liveish {
  background: linear-gradient(135deg, rgba(255,65,108,0.86), rgba(255,75,43,0.86));
  box-shadow: 0 10px 24px rgba(255,65,108,0.18);
}

.tt-badge.soft {
  background: rgba(0,0,0,0.34);
  border: 1px solid rgba(255,255,255,0.12);
}

.tt-top-btn {
  pointer-events: auto;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.34);
  color: #fff;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.tt-center {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.tt-center.show {
  opacity: 1;
}

.tt-center-icon {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 28px;
  color: #fff;
  background: rgba(0,0,0,0.34);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.24);
}

.tt-meta {
  min-width: 0;
  max-width: min(72%, 760px);
  display: grid;
  gap: 10px;
}

.tt-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tt-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #ff5478, #617bff);
  box-shadow: 0 12px 28px rgba(0,0,0,0.24);
  flex: 0 0 auto;
}

.tt-user-meta {
  min-width: 0;
}

.tt-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.tt-username {
  font-size: 15px;
  font-weight: 900;
  color: #fff;
}

.tt-dot {
  opacity: 0.62;
}

.tt-time {
  font-size: 12px;
  opacity: 0.82;
}

.tt-mode-line {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.74;
}

.tt-caption {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255,255,255,0.98);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
}

.tt-caption.expanded {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
}

.tt-more {
  margin-left: 8px;
  border: none;
  background: transparent;
  color: #fff;
  opacity: 0.88;
  font-weight: 900;
  cursor: pointer;
}

.tt-actions {
  pointer-events: auto;
  display: grid;
  gap: 10px;
  justify-items: end;
}

.tt-action {
  width: 74px;
  min-height: 74px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.34);
  color: #fff;
  border-radius: 22px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.22);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.tt-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(0,0,0,0.28);
}

.tt-action-icon {
  font-size: 22px;
  line-height: 1;
}

.tt-action-label {
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.tt-load-more {
  text-align: center;
  padding: 18px 10px;
  opacity: 0.74;
  font-size: 13px;
}

@media (max-width: 860px) {
  .tt-video-wrap,
  .tt-video,
  .tt-image,
  .tt-empty {
    min-height: 68vh;
    height: 68vh;
  }

  .is-reels .tt-video-wrap,
  .is-reels .tt-video,
  .is-reels .tt-image {
    min-height: 72vh;
    height: 72vh;
  }

  .tt-overlay.bottom {
    padding: 14px;
    gap: 12px;
  }

  .tt-meta {
    max-width: 72%;
  }

  .tt-action {
    width: 68px;
    min-height: 68px;
    border-radius: 20px;
  }
}

@media (max-width: 640px) {
  .tt-shell {
    border-radius: 24px;
  }

  .tt-video-wrap,
  .tt-video,
  .tt-image,
  .tt-empty {
    min-height: 62vh;
    height: 62vh;
  }

  .is-reels .tt-video-wrap,
  .is-reels .tt-video,
  .is-reels .tt-image {
    min-height: 68vh;
    height: 68vh;
  }

  .tt-overlay.top {
    padding: 12px;
  }

  .tt-overlay.bottom {
    padding: 12px;
    gap: 10px;
  }

  .tt-meta {
    max-width: 70%;
    gap: 8px;
  }

  .tt-avatar {
    width: 42px;
    height: 42px;
    font-size: 14px;
  }

  .tt-username {
    font-size: 14px;
  }

  .tt-caption {
    font-size: 13px;
  }

  .tt-action {
    width: 62px;
    min-height: 62px;
    border-radius: 18px;
    gap: 5px;
  }

  .tt-action-icon {
    font-size: 20px;
  }

  .tt-action-label {
    font-size: 11px;
  }

  .tt-center-icon {
    width: 72px;
    height: 72px;
    font-size: 24px;
  }
}
</style>