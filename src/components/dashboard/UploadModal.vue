<template>
  <div class="um-backdrop" @click.self="close">
    <div class="um-card">
      <div class="um-head">
        <div class="um-title">Create Post</div>
        <button class="um-x" @click="close">✕</button>
      </div>

      <div class="um-body">
        <textarea
          v-model="caption"
          class="um-text"
          placeholder="What’s happening?"
          rows="3"
        ></textarea>

        <div class="um-row">
          <label class="um-btn">
            🖼️ Image / 🎥 Video
            <input
              type="file"
              accept="image/*,video/*"
              class="um-file"
              @change="onPick"
            />
          </label>

          <button class="um-btn ghost" @click="clearMedia" :disabled="busy && !!file">
            Clear
          </button>

          <button class="um-btn primary" @click="submit" :disabled="busy || (!caption && !file)">
            {{ busy ? "Posting…" : "Post 🚀" }}
          </button>
        </div>

        <div v-if="file" class="um-preview">
          <div class="um-preview-top">
            <div class="um-meta">
              <div class="um-name">{{ file.name }}</div>
              <div class="um-sub">{{ prettyType }}</div>
            </div>
            <button class="um-btn tiny" @click="clearMedia" :disabled="busy">Remove</button>
          </div>

          <img
            v-if="isImage"
            class="um-media"
            :src="previewUrl"
            alt="preview"
          />
          <video
            v-else-if="isVideo"
            class="um-media"
            :src="previewUrl"
            controls
            playsinline
          ></video>

          <div v-if="uploadStatus" class="um-status">
            {{ uploadStatus }}
          </div>
        </div>

        <div v-if="error" class="um-error">
          ⚠️ {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

// IMPORTANT: use YOUR existing api instance path
// (most of your project uses src/api/http.js)
import api from "@/api/http";

const emit = defineEmits(["close", "posted"]);

const caption = ref("");
const file = ref(null);
const previewUrl = ref("");
const busy = ref(false);
const error = ref("");
const uploadStatus = ref("");

const isImage = computed(() => file.value?.type?.startsWith("image/"));
const isVideo = computed(() => file.value?.type?.startsWith("video/"));
const prettyType = computed(() => {
  if (!file.value) return "";
  if (isImage.value) return `Image • ${file.value.type}`;
  if (isVideo.value) return `Video • ${file.value.type}`;
  return file.value.type || "file";
});

function close() {
  if (busy.value) return; // prevent closing mid-upload
  emit("close");
}

function cleanupPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
}

function clearMedia() {
  cleanupPreview();
  file.value = null;
  uploadStatus.value = "";
}

function onPick(e) {
  error.value = "";
  uploadStatus.value = "";

  const f = e.target.files?.[0];
  if (!f) return;

  // Basic safety checks
  const maxMB = 60; // adjust if you want
  const sizeMB = f.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    error.value = `File too large (${sizeMB.toFixed(1)}MB). Max ${maxMB}MB.`;
    e.target.value = "";
    return;
  }

  cleanupPreview();
  file.value = f;
  previewUrl.value = URL.createObjectURL(f);
}

async function submit() {
  if (busy.value) return;
  error.value = "";

  if (!caption.value && !file.value) return;

  busy.value = true;
  uploadStatus.value = "";

  try {
    let image_url = null;
    let video_url = null;

    // 1) Upload media (Cloudinary via server)
    if (file.value) {
      uploadStatus.value = "Uploading media…";

      const fd = new FormData();
      fd.append("media", file.value);

      // server should respond: { url, kind }
      const up = await api.post("/api/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = up?.data?.url;
      const kind = up?.data?.kind; // optional

      if (!url) throw new Error("Upload failed: no url returned from /api/upload");

      // decide image vs video
      if (kind === "video" || isVideo.value) video_url = url;
      else image_url = url;

      uploadStatus.value = "Creating post…";
    } else {
      uploadStatus.value = "Creating post…";
    }

    // 2) Create post (store Cloudinary URL in DB)
    await api.post("/api/posts/create", {
      caption: caption.value || "",
      text: caption.value || "", // keeps compatibility with older server versions
      image_url,
      video_url,
    });

    caption.value = "";
    clearMedia();
    uploadStatus.value = "";

    // tell parent to refresh feed
    emit("posted");
    emit("close");
  } catch (e) {
    console.error(e);
    error.value = e?.response?.data?.error || e?.message || "Something went wrong.";
    uploadStatus.value = "";
  } finally {
    busy.value = false;
  }
}

onBeforeUnmount(() => cleanupPreview());
</script>

<style scoped>
.um-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  z-index: 9999;
}
.um-card {
  width: min(720px, 92vw);
  background: rgba(20, 22, 30, .92);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 120px rgba(0,0,0,.55);
}
.um-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.um-title { font-weight: 800; letter-spacing: .2px; }
.um-x {
  border: 0;
  background: rgba(255,255,255,.08);
  color: #fff;
  padding: 8px 10px;
  border-radius: 10px;
}
.um-body { padding: 14px 16px 16px; }
.um-text {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  color: #fff;
  padding: 12px 12px;
  outline: none;
}
.um-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.um-btn {
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  color: #fff;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.um-btn.primary {
  background: linear-gradient(135deg, rgba(255,65,90,.95), rgba(255,170,60,.9));
  border: 0;
  font-weight: 800;
}
.um-btn.ghost { background: rgba(255,255,255,.05); }
.um-btn.tiny { padding: 6px 10px; border-radius: 10px; }
.um-file { display: none; }

.um-preview {
  margin-top: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  border-radius: 16px;
  padding: 12px;
}
.um-preview-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.um-name { font-weight: 800; }
.um-sub { opacity: .75; font-size: 12px; }
.um-media {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(0,0,0,.35);
}
.um-status {
  margin-top: 10px;
  opacity: .85;
  font-size: 13px;
}
.um-error {
  margin-top: 12px;
  color: #ffb4b4;
  background: rgba(255,0,0,.12);
  border: 1px solid rgba(255,0,0,.20);
  padding: 10px 12px;
  border-radius: 12px;
}
</style>