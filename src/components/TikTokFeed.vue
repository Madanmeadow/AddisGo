<!-- src/components/TikTokFeed.vue -->
<template>
  <section class="ttx">
    <div class="ttx-snap" ref="snapRef" @scroll.passive="onScroll">
      <article
        v-for="(post, idx) in items"
        :key="keyOf(post, idx)"
        class="ttx-card"
        :data-idx="idx"
        ref="cardRefs"
      >
        <!-- MEDIA -->
        <div class="ttx-media" @pointerdown="onPointerDown($event, post, idx)">
          <img
            v-if="post.image_url && !post.video_url"
            class="ttx-img"
            :src="getMedia(post.image_url)"
            loading="lazy"
            alt=""
          />

          <video
            v-if="post.video_url"
            class="ttx-video"
            playsinline
            preload="metadata"
            loop
            :muted="globalMuted"
            :data-idx="idx"
            :src="getMedia(post.video_url)"
            @click.stop="toggleGlobalMuted"
          ></video>

          <!-- Burst hearts layer -->
          <div class="burst-layer">
            <span
              v-for="b in burstsByIdx[idx] || []"
              :key="b.id"
              class="burst-heart"
              :style="{
                left: b.x + 'px',
                top: b.y + 'px',
                transform: `rotate(${b.rot}deg)`,
                '--dx': b.dx + 'px',
                '--dy': b.dy + 'px',
                '--s': b.s
              }"
            >
              ❤️
            </span>
          </div>

          <!-- Big like flash -->
          <div class="big-like" :class="{ on: bigLikeIdx === idx }">❤️</div>

          <!-- Overlays -->
          <div class="ttx-top">
            <div class="ttx-brand">
              <span class="bolt">⚡</span>
              <span class="name">Pulse</span>
              <span class="pill">{{ modeLabel }}</span>
            </div>

            <button class="ttx-ic" @click.stop="toggleGlobalMuted">
              {{ globalMuted ? "🔇" : "🔊" }}
            </button>
          </div>

          <div class="ttx-bottom">
            <div class="ttx-meta">
              <div class="who">
                <div class="avatar">{{ getInitial(post.user_id) }}</div>
                <div class="whoTxt">
                  <div class="user">User #{{ post.user_id }}</div>
                  <div class="time">{{ formatDate(post.created_at) }}</div>
                </div>
              </div>

              <div v-if="post.caption" class="cap">
                {{ post.caption }}
              </div>

              <!-- AI-style label (simple now, smarter later) -->
              <div class="why" v-if="mode === 'foryou'">
                ✨ For you — trending now
              </div>
            </div>

            <!-- Actions -->
            <div class="ttx-actions">
              <button class="act" @click.stop="$emit('like', post)">
                ❤️ <span class="n">{{ likesCount(post) }}</span>
              </button>

              <button class="act" @click.stop="$emit('comments', post)">
                💬 <span class="n">{{ commentCount(post) }}</span>
              </button>

              <button class="act ghost" @click.stop="$emit('share', post)">
                🔗
              </button>
            </div>
          </div>

          <div class="ttx-progress">
            <div class="bar" :style="{ transform: `scaleX(${progress[idx] || 0})` }"></div>
          </div>
        </div>
      </article>

      <!-- Load more sentinel -->
      <div ref="sentinelRef" class="ttx-sentinel">
        <span v-if="loadingMore">Loading more…</span>
        <span v-else-if="canLoadMore">Scroll for more</span>
        <span v-else>You're all caught up ✨</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: "foryou" }, // "foryou" | "reels"
  globalMuted: { type: Boolean, default: true },
  canLoadMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },

  // functions from parent
  getMedia: { type: Function, required: true },
  formatDate: { type: Function, required: true },
  getInitial: { type: Function, required: true },

  // counts from parent
  likesCount: { type: Function, required: true },
  commentCount: { type: Function, required: true },
});

const emit = defineEmits(["toggle-muted", "load-more", "active", "like", "comments", "share"]);

const snapRef = ref(null);
const sentinelRef = ref(null);
const cardRefs = ref([]);
const activeIdx = ref(0);
const progress = ref({}); // idx -> 0..1

// Double tap + burst + local save
const bigLikeIdx = ref(-1);
const burstsByIdx = ref({}); // idx -> hearts[]
const lastTap = ref({ t: 0, x: 0, y: 0, idx: -1 });

// local liked state per post (persist)
const likedLocal = ref(new Map()); // postId -> boolean

const modeLabel = computed(() => (props.mode === "reels" ? "REELS" : "FOR YOU"));

let io = null;
let ioSentinel = null;
let raf = null;

function keyOf(post, idx) {
  return post?.id ?? `idx-${idx}`;
}

function toggleGlobalMuted() {
  emit("toggle-muted");
}

/* ---------- Local like persistence ---------- */
function storageKey() {
  return `pulse:liked:${props.mode}`;
}

function loadLocalLikes() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    const obj = JSON.parse(raw);
    const m = new Map();
    for (const [k, v] of Object.entries(obj)) m.set(Number(k), !!v);
    likedLocal.value = m;
  } catch {}
}

function saveLocalLikes() {
  try {
    const obj = {};
    likedLocal.value.forEach((v, k) => (obj[String(k)] = !!v));
    localStorage.setItem(storageKey(), JSON.stringify(obj));
  } catch {}
}

function isLiked(post) {
  if (!post?.id) return false;
  return likedLocal.value.get(post.id) === true;
}

/* ---------- Haptics (best-effort; iPhone often ignores vibrate) ---------- */
function hapticLight() {
  try {
    if (navigator?.vibrate) navigator.vibrate(12);
  } catch {}
}

function showBigLike(idx) {
  bigLikeIdx.value = idx;
  setTimeout(() => {
    if (bigLikeIdx.value === idx) bigLikeIdx.value = -1;
  }, 260);
}

function addBurst(idx, x, y) {
  const idBase = Date.now() + Math.random();
  const hearts = Array.from({ length: 8 }).map((_, i) => ({
    id: idBase + i,
    x,
    y,
    rot: Math.floor(Math.random() * 40 - 20),
    dx: (Math.random() * 2 - 1) * 90,
    dy: -40 - Math.random() * 120,
    s: 0.9 + Math.random() * 0.8,
  }));

  const cur = burstsByIdx.value[idx] || [];
  burstsByIdx.value = { ...burstsByIdx.value, [idx]: [...cur, ...hearts] };

  setTimeout(() => {
    const now = burstsByIdx.value[idx] || [];
    const ids = new Set(hearts.map((h) => h.id));
    burstsByIdx.value = { ...burstsByIdx.value, [idx]: now.filter((h) => !ids.has(h.id)) };
  }, 900);
}

function likeNow(post, idx, tapX, tapY) {
  if (!post?.id) return;

  // Always show delight
  hapticLight();
  showBigLike(idx);
  addBurst(idx, tapX, tapY);

  // Save + server like only if not already liked
  if (!isLiked(post)) {
    likedLocal.value.set(post.id, true);
    saveLocalLikes();
    emit("like", post);
  }
}

function onPointerDown(e, post, idx) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
  const y = Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top));

  const now = Date.now();
  const prev = lastTap.value;

  const isDouble =
    prev.idx === idx &&
    now - prev.t < 280 &&
    Math.hypot(x - prev.x, y - prev.y) < 28;

  lastTap.value = { t: now, x, y, idx };

  if (isDouble) {
    likeNow(post, idx, x, y);
    lastTap.value.t = 0; // prevent triple
  }
}

/* ---------- Video autoplay engine ---------- */
function pauseAll() {
  const root = snapRef.value;
  if (!root) return;
  root.querySelectorAll("video.ttx-video").forEach((v) => {
    try { v.pause(); } catch {}
  });
}

async function playActive(idx) {
  await nextTick();
  const root = snapRef.value;
  if (!root) return;

  pauseAll();

  const v = root.querySelector(`video.ttx-video[data-idx="${idx}"]`);
  if (!v) return;

  v.muted = props.globalMuted;

  try {
    const p = v.play();
    if (p?.catch) p.catch(() => {});
  } catch {}
}

function setupVideoProgress() {
  const root = snapRef.value;
  if (!root) return;

  root.querySelectorAll("video.ttx-video").forEach((v) => {
    v.ontimeupdate = () => {
      const idx = Number(v.dataset.idx);
      if (!Number.isFinite(idx)) return;
      if (!v.duration || !isFinite(v.duration)) return;
      progress.value[idx] = Math.min(1, Math.max(0, v.currentTime / v.duration));
    };
  });
}

function setupActiveObserver() {
  const root = snapRef.value;
  if (!root) return;

  if (io) io.disconnect();

  io = new IntersectionObserver(
    (entries) => {
      let best = { idx: activeIdx.value, ratio: 0 };
      for (const e of entries) {
        const idx = Number(e.target.dataset.idx);
        if (e.isIntersecting && e.intersectionRatio > best.ratio) {
          best = { idx, ratio: e.intersectionRatio };
        }
      }
      if (best.ratio >= 0.6 && best.idx !== activeIdx.value) {
        activeIdx.value = best.idx;
        emit("active", best.idx);
        playActive(best.idx);
      }
    },
    { root, threshold: [0.25, 0.4, 0.6, 0.8, 1] }
  );

  nextTick(() => {
    cardRefs.value?.forEach((el) => el && io.observe(el));
  });
}

function setupSentinelObserver() {
  const root = snapRef.value;
  const sentinel = sentinelRef.value;
  if (!root || !sentinel) return;

  if (ioSentinel) ioSentinel.disconnect();

  ioSentinel = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (e?.isIntersecting && props.canLoadMore && !props.loadingMore) {
        emit("load-more");
      }
    },
    { root, threshold: 0.2 }
  );

  ioSentinel.observe(sentinel);
}

function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => (raf = null));
}

watch(
  () => props.items.length,
  async () => {
    await nextTick();
    setupVideoProgress();
    setupActiveObserver();
    setupSentinelObserver();
    playActive(activeIdx.value);
  }
);

watch(
  () => props.globalMuted,
  () => {
    const root = snapRef.value;
    if (!root) return;
    const v = root.querySelector(`video.ttx-video[data-idx="${activeIdx.value}"]`);
    if (v) v.muted = props.globalMuted;
  }
);

onMounted(async () => {
  loadLocalLikes();
  await nextTick();
  setupVideoProgress();
  setupActiveObserver();
  setupSentinelObserver();
  playActive(0);
});

onBeforeUnmount(() => {
  if (io) io.disconnect();
  if (ioSentinel) ioSentinel.disconnect();
  if (raf) cancelAnimationFrame(raf);
});
</script>

<style scoped>
.ttx { width: 100%; }

/* TikTok snap container */
.ttx-snap{
  height: calc(100vh - 210px); /* adjust if needed */
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  border-radius: 18px;
}

.ttx-card{
  scroll-snap-align: start;
  scroll-snap-stop: always;
  height: calc(100vh - 210px);
}

.ttx-media{
  height: 100%;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(12px);
}

.ttx-img, .ttx-video{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
}

/* Overlays */
.ttx-top{
  position:absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  pointer-events: none;
}

.ttx-brand{
  pointer-events: none;
  display:flex;
  gap: 10px;
  align-items:center;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}
.ttx-brand .name{ font-weight: 900; letter-spacing:.4px; }
.ttx-brand .pill{
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.10);
}

.ttx-ic{
  pointer-events: auto;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.35);
  color: white;
  padding: 10px 12px;
}

.ttx-bottom{
  position:absolute;
  left: 10px;
  right: 10px;
  bottom: 12px;
  display:flex;
  align-items:flex-end;
  justify-content: space-between;
  gap: 12px;
}

.ttx-meta{
  max-width: calc(100% - 110px);
  padding: 12px 12px;
  border-radius: 16px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
}

.who{ display:flex; align-items:center; gap:10px; }
.avatar{
  width:42px; height:42px;
  border-radius: 16px;
  display:grid; place-items:center;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(255,79,216,.55), rgba(59,228,255,.35));
  border: 1px solid rgba(255,255,255,.12);
}
.user{ font-weight: 900; }
.time{ font-size: 12px; opacity: .75; }
.cap{ margin-top: 8px; font-weight: 700; line-height: 1.25; }
.why{ margin-top: 8px; font-size: 12px; opacity: .78; }

/* Actions */
.ttx-actions{ display:flex; flex-direction:column; gap: 10px; }
.act{
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.35);
  color: white;
  padding: 12px 12px;
  font-weight: 900;
  display:flex;
  gap: 8px;
  align-items:center;
  justify-content:center;
  min-width: 82px;
}
.act.ghost{ opacity: .9; }
.n{ opacity: .9; }

/* Progress */
.ttx-progress{
  position:absolute;
  left: 0; right: 0; bottom: 0;
  height: 4px;
  background: rgba(255,255,255,.10);
}
.ttx-progress .bar{
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(255,59,92,.85), rgba(255,79,216,.75));
}

/* Sentinel */
.ttx-sentinel{
  padding: 18px;
  text-align:center;
  opacity: .75;
}

/* Burst hearts */
.burst-layer{
  position:absolute;
  inset:0;
  pointer-events:none;
}

.burst-heart{
  position:absolute;
  font-size: 26px;
  transform: translate(-50%, -50%);
  animation: burstFly 700ms ease-out forwards;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.35));
}

@keyframes burstFly{
  0%{
    opacity: 0;
    transform: translate(-50%, -50%) scale(.7);
  }
  15%{
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100%{
    opacity: 0;
    transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% + var(--dy, -120px))) scale(var(--s, 1));
  }
}

/* Big heart flash */
.big-like{
  position:absolute;
  left:50%;
  top:48%;
  transform: translate(-50%,-50%) scale(.6);
  opacity:0;
  font-size: 78px;
  pointer-events:none;
  filter: drop-shadow(0 20px 45px rgba(255,59,92,.18));
  transition: opacity 160ms ease, transform 160ms ease;
}
.big-like.on{
  opacity:1;
  transform: translate(-50%,-50%) scale(1);
}
</style>