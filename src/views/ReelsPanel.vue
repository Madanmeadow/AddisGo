<template>
  <Layout>
    <div 
      class="reels-page" 
      :class="{ 'reduced-motion': prefersReducedMotion }"
      role="main"
      aria-label="Reels feed"
    >
      <header class="topbar" role="banner">
        <div class="left">
          <h1 class="title"><span aria-hidden="true">🎬</span> Reels</h1>
          <p class="sub">Short videos • swipe feed</p>
        </div>
        <div class="right">
          <button class="pill" @click="handleMuteToggle" :aria-label="muted ? 'Unmute videos' : 'Mute videos'" :aria-pressed="muted" type="button">
            <span class="pill-icon" aria-hidden="true">{{ muted ? '🔇' : '🔊' }}</span>
            <span class="pill-text">{{ muted ? 'Muted' : 'Sound' }}</span>
          </button>
          <button class="pill primary" @click="upload.openModal" aria-label="Upload new reel" type="button">
            <span class="pill-icon" aria-hidden="true">＋</span>
            <span class="pill-text">Upload</span>
          </button>
        </div>
      </header>

      <div v-if="!isOnline" class="notice offline" role="status">
        <span aria-hidden="true">📡</span> You're offline. Some features may be unavailable.
      </div>

      <div v-if="feed.error && feed.reels.length === 0" class="notice err" role="alert">
        <p>{{ feed.error }}</p>
        <button class="btn retry" @click="feed.loadReels(true)" type="button">Try Again</button>
      </div>

      <div v-if="feed.refreshing" class="pull-indicator" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span> Refreshing…
      </div>

      <div v-if="feed.loading && feed.reels.length === 0" class="skeleton-feed" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="skeleton-card">
          <div class="skeleton-media"><div class="skeleton-shimmer"></div></div>
          <div class="skeleton-actions">
            <div class="skeleton-circle" v-for="m in 3" :key="m"></div>
          </div>
        </div>
      </div>

      <main class="feed" ref="feedRef" tabindex="-1" aria-label="Reels feed" @scroll="handleScroll" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
        <section v-for="(r, index) in feed.reels" :key="r.id" class="reel-card" :data-reel-id="String(r.id)" :data-index="index" :class="{ 'is-playing': videoPlayer.playingId.value === r.id }" :style="{ animationDelay: `${index * 80}ms` }">
          <div v-if="heartAnimations[r.id]" class="heart-burst" :class="{ active: heartAnimations[r.id] }" aria-hidden="true">❤️</div>
          <div class="media">
            <video v-if="isVideo(r)" class="video" :ref="(el) => setVideoRef(el as HTMLVideoElement, r.id)" :src="mediaUrl(r)" :poster="r.thumbnail_url" playsinline preload="metadata" :muted="muted" loop crossorigin="anonymous" @click="handleVideoClick(r)" @dblclick="handleDoubleTapLike(r)" />
            <img v-else class="image" :src="mediaUrl(r)" :alt="r.caption || 'Reel image'" loading="lazy" @click="toggleLike(r)" @dblclick="handleDoubleTapLike(r)" />
            <div v-if="isVideo(r) && videoPlayer.isBuffering(r.id)" class="buffer-overlay" aria-hidden="true"><span class="spinner"></span></div>
            <div v-if="isVideo(r)" class="progress-bar" aria-hidden="true"><div class="progress-fill" :style="{ width: videoProgress[r.id] + '%' }"></div></div>
            <div class="overlay">
              <div class="meta">
                <div class="user-row">
                  <div class="avatar" v-if="r.user?.avatar_url"><img :src="r.user.avatar_url" alt="" /></div>
                  <div class="name">{{ displayName(r) }}</div>
                  <div v-if="r.user?.verified" class="verified" aria-label="Verified account" title="Verified">✓</div>
                </div>
                <div v-if="r.caption" class="caption">{{ r.caption }}</div>
                <time class="timestamp" :datetime="r.created_at">{{ formatTime(r.created_at) }}</time>
              </div>
              <div class="actions">
                <button class="act" @click="toggleLike(r)" :aria-label="r.liked_by_me ? 'Unlike reel' : 'Like reel'" :aria-pressed="!!r.liked_by_me" type="button">
                  <div class="icon" :class="{ liked: !!r.liked_by_me }" aria-hidden="true">{{ r.liked_by_me ? '❤️' : '🤍' }}</div>
                  <div class="count">{{ formatCount(r.likes_count) }}</div>
                </button>
                <button class="act" @click="comments.openDrawer(r)" aria-label="Open comments" type="button">
                  <div class="icon" aria-hidden="true">💬</div>
                  <div class="count">{{ formatCount(r.comments_count) }}</div>
                </button>
                <button class="act" @click="shareReel(r)" aria-label="Share reel" type="button">
                  <div class="icon" aria-hidden="true">🔗</div>
                  <div class="count">Share</div>
                </button>
                <button v-if="isVideo(r)" class="act" @click="togglePiP(r.id)" aria-label="Picture in picture" type="button">
                  <div class="icon" aria-hidden="true">📺</div>
                  <div class="count">PiP</div>
                </button>
              </div>
            </div>
            <div v-if="isVideo(r) && videoPlayer.isPaused(r.id)" class="play-hint" aria-hidden="true">
              <span class="play-icon">▶</span><span>Tap to play</span>
            </div>
            <div v-if="isVideo(r) && !videoPlayer.isPaused(r.id) && muted" class="muted-badge" aria-hidden="true">🔇</div>
          </div>
        </section>

        <div v-if="feed.isEmpty" class="empty-state">
          <div class="empty-emoji" aria-hidden="true">🎥</div>
          <h2>No reels yet</h2>
          <p>Be the first to share something amazing.</p>
          <button class="btn primary" @click="upload.openModal" type="button">Upload First Reel</button>
        </div>

        <div v-if="feed.loading && feed.reels.length > 0" class="skeleton-card skeleton-inline" aria-hidden="true">
          <div class="skeleton-media"><div class="skeleton-shimmer"></div></div>
        </div>

        <div v-if="!feed.hasMore && feed.reels.length > 0" class="end-of-feed" role="status">
          <span aria-hidden="true">✨</span> You're all caught up
        </div>
      </main>

      <button class="keyboard-help-btn" @click="showShortcuts = true" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" type="button">?</button>

      <Transition name="modal">
        <div v-if="upload.open.value" class="modal-backdrop" @click.self="upload.closeModal" role="dialog" aria-modal="true" aria-labelledby="upload-title" ref="uploadModalRef">
          <div class="modal">
            <div class="modal-head">
              <h2 class="modal-title" id="upload-title">Upload Reel</h2>
              <button class="x" @click="upload.closeModal" aria-label="Close upload dialog" type="button">✕</button>
            </div>
            <div class="modal-body">
              <div class="drop-zone" :class="{ dragover: upload.dragOver.value }" @dragover.prevent="upload.dragOver.value = true" @dragleave.prevent="upload.dragOver.value = false" @drop.prevent="upload.onDrop">
                <input id="reel-file" type="file" accept="video/*,image/*" @change="upload.onPickFile" class="file-input" aria-describedby="file-hint" />
                <label for="reel-file" class="drop-label">
                  <span class="drop-icon" aria-hidden="true">📁</span>
                  <span class="drop-text">{{ upload.pickedFile.value ? 'Change file' : 'Drop a video or image here' }}</span>
                  <span class="drop-hint" id="file-hint">MP4, WebM, MOV, JPG, PNG up to 100MB</span>
                </label>
              </div>
              <div v-if="upload.pickedFile.value" class="file-preview">
                <div class="file-info">
                  <span class="file-name">{{ upload.pickedFile.value.name }}</span>
                  <span class="file-size">{{ upload.fileSize.value }}</span>
                </div>
                <button class="file-remove" @click="upload.pickedFile.value = null" aria-label="Remove file" type="button">✕</button>
              </div>
              <div class="row">
                <label class="label" for="reel-caption">Caption</label>
                <textarea id="reel-caption" v-model="upload.caption.value" class="input" placeholder="Say something about your reel…" rows="3" maxlength="500" aria-describedby="caption-hint" />
                <div class="hint text-right" id="caption-hint">{{ upload.caption.value.length }}/500</div>
              </div>
              <div v-if="upload.error.value" class="notice err" role="alert">{{ upload.error.value }}</div>
              <div v-if="upload.uploading.value" class="upload-progress">
                <div class="progress-track"><div class="progress-fill" :style="{ width: upload.progress.value + '%' }"></div></div>
                <span class="progress-text">Uploading…</span>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn" @click="upload.closeModal" :disabled="upload.uploading.value" type="button">Cancel</button>
              <button class="btn primary" @click="handleUpload" :disabled="upload.uploading.value || !upload.pickedFile.value" type="button">{{ upload.uploading.value ? 'Posting…' : 'Post Reel' }}</button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="drawer">
        <div v-if="comments.open.value" class="drawer-backdrop" @click.self="comments.closeDrawer" role="dialog" aria-modal="true" aria-labelledby="comments-title" ref="commentsDrawerRef">
          <div class="drawer">
            <div class="drawer-head">
              <h2 class="drawer-title" id="comments-title">Comments <span v-if="comments.activeReel.value" class="drawer-count">{{ formatCount(comments.activeReel.value.comments_count ?? 0) }}</span></h2>
              <button class="x" @click="comments.closeDrawer" aria-label="Close comments" type="button">✕</button>
            </div>
            <div class="drawer-body" ref="commentsBodyRef" tabindex="-1">
              <div v-if="comments.loading.value" class="comments-skeleton">
                <div v-for="n in 4" :key="n" class="skeleton-comment">
                  <div class="skeleton-avatar"></div>
                  <div class="skeleton-lines"><div class="skeleton-line short"></div><div class="skeleton-line"></div></div>
                </div>
              </div>
              <div v-if="comments.error.value && comments.comments.value.length === 0" class="notice err" role="alert">
                {{ comments.error.value }}
                <button class="btn retry" @click="comments.loadComments" type="button">Retry</button>
              </div>
              <div v-if="comments.comments.value.length === 0 && !comments.loading.value" class="empty">
                <span aria-hidden="true">💬</span>
                <p>No comments yet. Be the first to share your thoughts.</p>
              </div>
              <div v-else class="comments-list">
                <div v-for="c in comments.comments.value" :key="c.id" class="comment" :class="{ optimistic: String(c.id).startsWith('temp_') }">
                  <div class="c-avatar" v-if="c.user?.avatar_url"><img :src="c.user.avatar_url" alt="" /></div>
                  <div class="c-content">
                    <div class="c-top"><div class="c-name">{{ displayName(c) }}</div><time class="c-time" :datetime="c.created_at">{{ formatTime(c.created_at) }}</time></div>
                    <div class="c-text">{{ c.text }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="drawer-foot">
              <input ref="commentInputRef" class="c-input" v-model="commentText" placeholder="Write a comment…" @keydown.enter.prevent="handleSendComment" maxlength="500" aria-label="Write a comment" :disabled="comments.sending.value" />
              <button class="btn primary" @click="handleSendComment" :disabled="!commentText.trim() || comments.sending.value" type="button">{{ comments.sending.value ? '…' : 'Send' }}</button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div v-if="showShortcuts" class="modal-backdrop" @click.self="showShortcuts = false" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
          <div class="modal shortcuts-modal">
            <div class="modal-head">
              <h2 class="modal-title" id="shortcuts-title">Keyboard Shortcuts</h2>
              <button class="x" @click="showShortcuts = false" aria-label="Close shortcuts" type="button">✕</button>
            </div>
            <div class="modal-body">
              <div class="shortcut-grid">
                <div class="shortcut"><kbd>Space</kbd> <span>Play / Pause video</span></div>
                <div class="shortcut"><kbd>M</kbd> <span>Toggle mute</span></div>
                <div class="shortcut"><kbd>L</kbd> <span>Like current reel</span></div>
                <div class="shortcut"><kbd>C</kbd> <span>Open comments</span></div>
                <div class="shortcut"><kbd>S</kbd> <span>Share current reel</span></div>
                <div class="shortcut"><kbd>↑</kbd> <span>Previous reel</span></div>
                <div class="shortcut"><kbd>↓</kbd> <span>Next reel</span></div>
                <div class="shortcut"><kbd>?</kbd> <span>Show this help</span></div>
                <div class="shortcut"><kbd>Esc</kbd> <span>Close modal / drawer</span></div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <div class="toast-container" role="region" aria-label="Notifications">
        <TransitionGroup name="toast">
          <div v-for="t in toast.toasts.value" :key="t.id" class="toast" :class="t.type" role="status" aria-live="polite">{{ t.message }}</div>
        </TransitionGroup>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useReelsFeed } from './composables/useReelsFeed';
import { useVideoPlayer } from './composables/useVideoPlayer';
import { useComments } from './composables/useComments';
import { useUpload } from './composables/useUpload';
import { useToast } from './composables/useToast';
import { useFocusTrap } from './composables/useFocusTrap';
import { useApi } from './composables/useApi';
import type { Reel, Comment } from './types';

const auth = useAuthStore();
const token = computed(() => auth?.token || localStorage.getItem('token') || '');

const feed = useReelsFeed();
const videoPlayer = useVideoPlayer();
const comments = useComments();
const upload = useUpload();
const toast = useToast();

const feedRef = ref<HTMLElement | null>(null);
const commentsBodyRef = ref<HTMLElement | null>(null);
const commentInputRef = ref<HTMLInputElement | null>(null);
const uploadModalRef = ref<HTMLElement | null>(null);
const commentsDrawerRef = ref<HTMLElement | null>(null);
const showShortcuts = ref(false);
const commentText = ref('');
const heartAnimations = ref<Record<string | number, boolean>>({});
const videoProgress = ref<Record<string | number, number>>({});
const isOnline = ref(navigator.onLine);
const prefersReducedMotion = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const uploadFocusTrap = useFocusTrap(uploadModalRef);
const commentsFocusTrap = useFocusTrap(commentsDrawerRef);

watch(() => upload.open.value, (open) => {
  if (open) nextTick(() => uploadFocusTrap.activate());
  else uploadFocusTrap.deactivate();
});

watch(() => comments.open.value, (open) => {
  if (open) {
    nextTick(() => {
      commentsFocusTrap.activate();
      commentInputRef.value?.focus();
    });
  } else {
    commentsFocusTrap.deactivate();
  }
});

watch(showShortcuts, (open) => {
  if (open) nextTick(() => uploadFocusTrap.activate());
  else uploadFocusTrap.deactivate();
});

function isVideo(r: Reel): boolean {
  const t = (r.media_type || '').toLowerCase();
  if (t) return t.includes('video');
  const u = mediaUrl(r);
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u || '');
}

function mediaUrl(r: Reel): string {
  return r.video_url || r.media_url || r.image_url || '';
}

function displayName(r: Reel | Comment): string {
  const user = 'user' in r ? r.user : undefined;
  return user?.display_name || user?.username || (r as any).display_name || (r as any).username || 'User';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n ?? 0);
}

function formatTime(ts: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function setVideoRef(el: HTMLVideoElement | null, reelId: string | number) {
  videoPlayer.setVideoRef(el, reelId);
  if (el) {
    el.addEventListener('timeupdate', () => {
      if (el.duration) {
        videoProgress.value[reelId] = (el.currentTime / el.duration) * 100;
      }
    });
  }
}

function handleMuteToggle() {
  const isMuted = videoPlayer.toggleMute();
  toast.show(isMuted ? 'Muted' : 'Sound on', { type: 'info' });
}

function handleVideoClick(r: Reel) {
  videoPlayer.togglePlay(r.id);
}

function handleDoubleTapLike(r: Reel) {
  heartAnimations.value[r.id] = true;
  setTimeout(() => { heartAnimations.value[r.id] = false; }, 800);
  if (!r.liked_by_me) toggleLike(r);
}

async function toggleLike(r: Reel) {
  if (!token.value) {
    toast.show('Please log in to like reels', { type: 'error' });
    return;
  }
  const id = r.id;
  const currentlyLiked = !!r.liked_by_me;
  feed.updateReel(id, {
    liked_by_me: !currentlyLiked,
    likes_count: (r.likes_count ?? 0) + (currentlyLiked ? -1 : 1),
  });
  try {
    const { apiFetch } = useApi();
    let res: any;
    try {
      res = await apiFetch(`/reels/${id}/like`, { method: 'POST' });
    } catch {
      res = await apiFetch(`/reels/${id}/toggle-like`, { method: 'POST' });
    }
    if (typeof res?.likes_count === 'number') feed.updateReel(id, { likes_count: res.likes_count });
    if (typeof res?.liked === 'boolean') feed.updateReel(id, { liked_by_me: res.liked });
  } catch (e: any) {
    feed.updateReel(id, {
      liked_by_me: currentlyLiked,
      likes_count: (r.likes_count ?? 0),
    });
    toast.show(e?.message || 'Like failed', { type: 'error' });
  }
}

async function shareReel(r: Reel) {
  const url = `${window.location.origin}/reels/${r.id}`;
  const shareData = { title: 'Check out this reel', text: r.caption || 'Watch this reel!', url };
  if (navigator.share && navigator.canShare?.(shareData)) {
    try { await navigator.share(shareData); toast.show('Shared successfully', { type: 'success' }); return; } catch {}
  }
  try { await navigator.clipboard.writeText(url); toast.show('Link copied to clipboard', { type: 'success' }); }
  catch { toast.show(url, { type: 'info', duration: 5000 }); }
}

async function togglePiP(reelId: string | number) {
  const v = videoPlayer.videoEls.value.get(reelId);
  if (!v) return;
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await v.requestPictureInPicture();
  } catch { toast.show('Picture-in-picture not available', { type: 'error' }); }
}

async function handleUpload() {
  const created = await upload.submit();
  if (created) {
    feed.prependReel(created);
    toast.show('Reel posted successfully', { type: 'success' });
    nextTick(() => { if (feedRef.value) videoPlayer.setupObserver(feedRef.value); });
  }
}

async function handleSendComment() {
  const text = commentText.value.trim();
  if (!text) return;
  const c = await comments.sendComment(text);
  if (c) {
    commentText.value = '';
    nextTick(() => { commentsBodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
}

let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
function handleScroll() {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const el = feedRef.value;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
    if (nearBottom && feed.canLoadMore.value) feed.loadReels(false);
  }, 150);
}

let touchStartY = 0;
let touchStartX = 0;
let isPulling = false;
function handleTouchStart(e: TouchEvent) {
  const el = feedRef.value;
  if (!el) return;
  if (el.scrollTop === 0) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    isPulling = true;
  }
}
function handleTouchEnd(e: TouchEvent) {
  if (!isPulling) return;
  isPulling = false;
  const diffY = e.changedTouches[0].clientY - touchStartY;
  const diffX = Math.abs(e.changedTouches[0].clientX - touchStartX);
  if (diffY > 100 && diffX < 50 && feedRef.value?.scrollTop === 0) feed.refresh();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showShortcuts.value) { showShortcuts.value = false; return; }
    if (comments.open.value) { comments.closeDrawer(); return; }
    if (upload.open.value) { upload.closeModal(); return; }
  }
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    if (e.key === 'Escape') (e.target as HTMLElement).blur();
    return;
  }
  const activeReel = feed.reels.value.find(r => videoPlayer.playingId.value === r.id);
  switch (e.key) {
    case '?': e.preventDefault(); showShortcuts.value = true; break;
    case ' ': e.preventDefault(); if (activeReel && isVideo(activeReel)) videoPlayer.togglePlay(activeReel.id); break;
    case 'm': case 'M': handleMuteToggle(); break;
    case 'l': case 'L': if (activeReel) toggleLike(activeReel); break;
    case 'c': case 'C': if (activeReel) comments.openDrawer(activeReel); break;
    case 's': case 'S': if (activeReel) shareReel(activeReel); break;
    case 'ArrowUp': e.preventDefault(); scrollToReel(-1); break;
    case 'ArrowDown': e.preventDefault(); scrollToReel(1); break;
  }
}

function scrollToReel(direction: number) {
  const cards = feedRef.value?.querySelectorAll('.reel-card');
  if (!cards?.length) return;
  const currentIdx = Array.from(cards).findIndex(c => {
    const rect = c.getBoundingClientRect();
    return rect.top >= 0 && rect.top < window.innerHeight / 2;
  });
  const nextIdx = Math.max(0, Math.min(cards.length - 1, currentIdx + direction));
  cards[nextIdx]?.scrollIntoView({ behavior: prefersReducedMotion.value ? 'auto' : 'smooth', block: 'start' });
}

function handleOnline() { isOnline.value = true; }
function handleOffline() { isOnline.value = false; toast.show('You are offline', { type: 'error' }); }
function handleMotionPreference(e: MediaQueryListEvent) { prefersReducedMotion.value = e.matches; }

onMounted(async () => {
  await feed.loadReels(true);
  nextTick(() => { if (feedRef.value) videoPlayer.setupObserver(feedRef.value); });
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('keydown', handleKeydown);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', handleMotionPreference);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('keydown', handleKeydown);
  window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', handleMotionPreference);
  videoPlayer.cleanup();
  if (scrollTimeout) clearTimeout(scrollTimeout);
});
</script>

<style scoped>
.reels-page {
  --color-bg: #0a0e1a;
  --color-surface: rgba(255, 255, 255, 0.04);
  --color-surface-hover: rgba(255, 255, 255, 0.08);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-text: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.65);
  --color-text-muted: rgba(255, 255, 255, 0.45);
  --color-primary: #ff3b7a;
  --color-primary-light: #ff7a3b;
  --color-error: #ff4444;
  --color-error-bg: rgba(255, 68, 68, 0.12);
  --color-success: #44ff88;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(255, 59, 122, 0.3);
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100%;
  padding: 16px 16px 100px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sub { opacity: 0.6; font-size: 13px; margin-top: 4px; font-weight: 500; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 10px 16px;
  border-radius: 999px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(10px);
}

.pill:hover {
  background: var(--color-surface-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.pill:active { transform: translateY(0); }

.pill.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border: none;
  font-weight: 800;
  box-shadow: 0 4px 16px rgba(255, 59, 122, 0.3);
}

.pill.primary:hover {
  box-shadow: 0 6px 24px rgba(255, 59, 122, 0.4);
  transform: translateY(-1px) scale(1.02);
}

.pill-icon { font-size: 15px; line-height: 1; }

.notice {
  margin: 12px 0;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: 14px;
  line-height: 1.5;
}

.notice.err {
  background: var(--color-error-bg);
  border-color: rgba(255, 68, 68, 0.25);
  color: #ffb0b0;
}

.notice.offline {
  background: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.2);
  color: #ffd54f;
}

.feed {
  height: calc(100vh - 170px);
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  border-radius: var(--radius-xl);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.feed::-webkit-scrollbar { width: 6px; }
.feed::-webkit-scrollbar-track { background: transparent; }
.feed::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.reel-card {
  position: relative;
  scroll-snap-align: start;
  padding: 8px;
  opacity: 0;
  transform: translateY(20px);
  animation: cardEnter 0.5s var(--transition-base) forwards;
}

@keyframes cardEnter {
  to { opacity: 1; transform: translateY(0); }
}

.media {
  position: relative;
  height: calc(100vh - 200px);
  min-height: 480px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2));
  cursor: pointer;
}

.video, .image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--transition-slow);
}

.reel-card.is-playing .video { transform: scale(1.02); }

.heart-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 80px;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
}

.heart-burst.active { animation: heartBurst 0.8s ease-out forwards; }

@keyframes heartBurst {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  30% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.5) translateY(-40px); opacity: 0; }
}

.buffer-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255,255,255,0.1);
  z-index: 5;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  transition: width 0.3s linear;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, transparent 70%);
  pointer-events: none;
}

.meta { max-width: 65%; pointer-events: none; }

.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.2);
}

.avatar img { width: 100%; height: 100%; object-fit: cover; }

.name {
  font-weight: 800;
  font-size: 15px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.verified {
  width: 16px;
  height: 16px;
  background: #1da1f2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 900;
  color: white;
}

.caption {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timestamp { display: block; margin-top: 6px; font-size: 12px; opacity: 0.5; }

.actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  pointer-events: auto;
}

.act {
  width: 56px;
  padding: 10px 6px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(12px);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.act:hover {
  background: rgba(0,0,0,0.5);
  transform: scale(1.08);
  border-color: rgba(255,255,255,0.2);
}

.act:active { transform: scale(0.95); }

.icon {
  font-size: 22px;
  line-height: 1;
  transition: transform var(--transition-fast);
}

.icon.liked {
  animation: likePop 0.4s ease-out;
  filter: drop-shadow(0 0 8px rgba(255, 60, 120, 0.5));
}

@keyframes likePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.count { font-size: 11px; font-weight: 700; opacity: 0.85; }

.play-hint {
  position: absolute;
  inset: auto 50% 24px;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: var(--radius-lg);
  background: rgba(0,0,0,0.45);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  pointer-events: none;
  animation: fadeInUp 0.4s ease-out;
}

.play-icon { font-size: 10px; }

.muted-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: rgba(0,0,0,0.45);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  font-size: 13px;
  pointer-events: none;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 12px;
}

.empty-emoji { font-size: 64px; opacity: 0.8; margin-bottom: 8px; }
.empty-state h2 { font-size: 20px; font-weight: 800; margin: 0; }
.empty-state p { opacity: 0.6; margin: 0 0 8px; }

.skeleton-feed { display: flex; flex-direction: column; gap: 12px; }
.skeleton-card { padding: 8px; }
.skeleton-media {
  height: calc(100vh - 200px);
  min-height: 480px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  overflow: hidden;
  position: relative;
}
.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.skeleton-actions {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton-circle {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.06);
}
.skeleton-inline .skeleton-media { height: 200px; min-height: auto; }

.comments-skeleton { display: flex; flex-direction: column; gap: 12px; }
.skeleton-comment {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  width: 80%;
}
.skeleton-line.short { width: 40%; }

.end-of-feed { text-align: center; padding: 32px; opacity: 0.5; font-size: 14px; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.modal {
  width: min(520px, 100%);
  border-radius: var(--radius-xl);
  background: rgba(16, 20, 32, 0.98);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.modal-head, .drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title, .drawer-title {
  font-weight: 900;
  font-size: 17px;
  margin: 0;
}

.drawer-count {
  opacity: 0.5;
  font-weight: 600;
  font-size: 14px;
  margin-left: 8px;
}

.x {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition-fast);
}

.x:hover {
  background: var(--color-surface-hover);
  transform: rotate(90deg);
}

.modal-body { padding: 20px; }
.row { margin-bottom: 16px; }
.label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 59, 122, 0.15);
}

.hint { margin-top: 6px; font-size: 12px; opacity: 0.6; }
.text-right { text-align: right; }

.drop-zone {
  position: relative;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px 20px;
  text-align: center;
  transition: all var(--transition-fast);
  margin-bottom: 16px;
}

.drop-zone.dragover {
  border-color: var(--color-primary);
  background: rgba(255, 59, 122, 0.05);
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.drop-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.drop-icon { font-size: 32px; }
.drop-text { font-weight: 700; font-size: 15px; }
.drop-hint { font-size: 12px; opacity: 0.5; }

.file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  margin-bottom: 16px;
}

.file-name { font-weight: 600; font-size: 13px; }
.file-size { font-size: 12px; opacity: 0.5; margin-left: 8px; }

.file-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.08);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.file-remove:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.upload-progress { margin-top: 12px; }
.progress-track {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  transition: width 0.3s ease;
}
.progress-text {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.6;
  text-align: center;
}

.modal-foot {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.btn:hover:not(:disabled) { background: var(--color-surface-hover); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border: none;
  font-weight: 800;
}

.btn.primary:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

.btn.retry { margin-top: 8px; font-size: 13px; padding: 8px 14px; }

/* ─── Drawer ─── */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 60;
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: min(480px, 100%);
  height: 100%;
  background: rgba(14, 18, 30, 0.98);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.drawer-body::-webkit-scrollbar { width: 5px; }
.drawer-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.comments-list { display: flex; flex-direction: column; gap: 10px; }

.comment {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  gap: 12px;
  transition: all var(--transition-fast);
}

.comment.optimistic { opacity: 0.7; border-style: dashed; }

.c-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.c-avatar img { width: 100%; height: 100%; object-fit: cover; }

.c-content { flex: 1; min-width: 0; }

.c-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.c-name { font-weight: 800; font-size: 13px; }
.c-time { opacity: 0.5; font-size: 11px; flex-shrink: 0; }
.c-text { margin-top: 6px; font-size: 14px; line-height: 1.4; word-break: break-word; }

.drawer-foot {
  padding: 14px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 10px;
  background: rgba(14, 18, 30, 0.95);
}

.c-input {
  flex: 1;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.c-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 59, 122, 0.15);
}

/* ─── Shortcuts Modal ─── */
.shortcuts-modal { width: min(400px, 100%); }

.shortcut-grid { display: grid; gap: 12px; }

.shortcut {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

/* ─── Keyboard Help Button ─── */
.keyboard-help-btn {
  position: fixed;
  bottom: 100px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  transition: all var(--transition-fast);
  z-index: 40;
}

.keyboard-help-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: scale(1.1);
}

/* ─── Toasts ─── */
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 100px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  padding: 12px 20px;
  border-radius: 999px;
  background: rgba(0,0,0,0.75);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  color: var(--color-text);
  font-weight: 700;
  font-size: 14px;
  box-shadow: var(--shadow-md);
  text-align: center;
  white-space: nowrap;
}

.toast.success {
  background: rgba(68, 255, 136, 0.15);
  border-color: rgba(68, 255, 136, 0.25);
  color: #a8ffc8;
}

.toast.error {
  background: var(--color-error-bg);
  border-color: rgba(255, 68, 68, 0.25);
  color: #ffb0b0;
}

/* ─── Transitions ─── */
.modal-enter-active, .modal-leave-active { transition: opacity var(--transition-base); }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.modal-enter-active .modal, .modal-leave-active .modal {
  transition: transform var(--transition-slow), opacity var(--transition-base);
}

.modal-enter-from .modal, .modal-leave-to .modal {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.drawer-enter-active, .drawer-leave-active { transition: opacity var(--transition-base); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }

.drawer-enter-active .drawer, .drawer-leave-active .drawer {
  transition: transform var(--transition-slow);
}

.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }

.toast-enter-active, .toast-leave-active { transition: all var(--transition-base); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(20px) scale(0.9); }

/* ─── Reduced Motion ─── */
.reels-page.reduced-motion *,
.reels-page.reduced-motion *::before,
.reels-page.reduced-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .title { font-size: 22px; }
  .pill-text { display: none; }
  .pill { padding: 10px; }
  .pill-icon { font-size: 18px; }
  .media { min-height: 380px; }
  .overlay { padding: 14px; }
  .actions { gap: 10px; }
  .act { width: 50px; padding: 8px 4px; }
  .drawer { width: 100%; }
  .keyboard-help-btn { display: none; }
}

@media (min-width: 1024px) {
  .feed {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    scroll-snap-type: none;
    height: auto;
    overflow: visible;
  }
  .reel-card { scroll-snap-align: none; }
  .media { height: 70vh; min-height: 520px; }
}

/* ─── Safe Area ─── */
@supports (padding: max(0px)) {
  .reels-page { padding-bottom: max(100px, env(safe-area-inset-bottom) + 20px); }
  .toast-container { bottom: max(100px, env(safe-area-inset-bottom) + 24px); }
  .keyboard-help-btn { bottom: max(100px, env(safe-area-inset-bottom) + 20px); }
}

/* ─── High Contrast Mode ─── */
@media (prefers-contrast: high) {
  .reels-page {
    --color-border: rgba(255,255,255,0.3);
    --color-surface: rgba(255,255,255,0.1);
  }
}
</style>