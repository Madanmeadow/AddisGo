<template>
  <div class="overlay" @click.self="emitClose">
    <div class="modal">
      <div class="head">
        <div class="title">
          <div class="dot"></div>
          <div>
            <div class="h1">Create Post</div>
            <div class="h2">Text • Photo • Video (Cloudinary)</div>
          </div>
        </div>

        <button class="x" @click="emitClose">✕</button>
      </div>

      <!-- CAPTION -->
      <label class="label">Caption / Text</label>
      <textarea
        v-model="caption"
        class="input"
        rows="3"
        placeholder="What's happening?"
        :disabled="busy"
      />

      <!-- MEDIA -->
      <div class="row">
        <div class="picker">
          <label class="label">Add Photo/Video</label>
          <input
            ref="fileInput"
            class="file"
            type="file"
            accept="image/*,video/*"
            @change="onPick"
            :disabled="busy"
          />
          <div class="hint">
            Tip: video can be big. If it fails, try shorter video first.
          </div>
        </div>

        <div class="preview" v-if="previewUrl">
          <div class="previewTitle">Preview</div>
          <img v-if="pickedKind === 'image'" :src="previewUrl" class="media" />
          <video
            v-else
            :src="previewUrl"
            class="media"
            controls
            playsinline
          ></video>

          <button class="mini danger" @click="clearMedia" :disabled="busy">
            Remove
          </button>
        </div>
      </div>

      <!-- STATUS -->
      <div class="status" v-if="status">
        <span class="pill" :class="{ ok: okStatus, bad: badStatus }">
          {{ status }}
        </span>
      </div>

      <!-- ACTIONS -->
      <div class="actions">
        <button class="btn ghost" @click="emitClose" :disabled="busy">
          Cancel
        </button>
        <button class="btn" @click="submit" :disabled="busy || (!caption && !file)">
          <span v-if="!busy">Post 🚀</span>
          <span v-else>Posting…</span>
        </button>
      </div>

      <div class="foot">
        <div class="tiny">
          If you ever see media turn dark after deploy, it means posts stored local
          filenames instead of Cloudinary URLs. This modal prevents that.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";

const emit = defineEmits(["close", "posted"]);
const emitClose = () => emit("close");

/* ---------------- STATE ---------------- */
const caption = ref("");
const file = ref(null);
const fileInput = ref(null);

const previewUrl = ref("");
const pickedKind = ref(""); // "image" | "video"

const busy = ref(false);
const status = ref("");

const okStatus = computed(() => status.value.startsWith("✅"));
const badStatus = computed(() => status.value.startsWith("❌"));

/* ---------------- HELPERS ---------------- */
function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function apiBase() {
  // Works with Vercel + Railway. If VITE_API_URL is set, use it.
  const env = import.meta.env?.VITE_API_URL;
  if (env) return String(env).replace(/\/$/, "");

  // Fallback: same origin (common when proxying /api)
  return "";
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function postJSONSmart(pathA, pathB, bodyObj) {
  // Tries /api/... first then non-/api (or vice versa) so you don't 404.
  const tries = [pathA, pathB].filter(Boolean);

  let lastErr = null;
  for (const p of tries) {
    try {
      const res = await fetch(apiBase() + p, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(bodyObj),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        // if 404, try next path; otherwise throw immediately
        if (res.status === 404) {
          lastErr = new Error(`404 on ${p}: ${txt}`);
          continue;
        }
        throw new Error(`POST ${p} failed (${res.status}): ${txt}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("POST failed");
}

async function postFormSmart(pathA, pathB, formData) {
  const tries = [pathA, pathB].filter(Boolean);

  let lastErr = null;
  for (const p of tries) {
    try {
      const res = await fetch(apiBase() + p, {
        method: "POST",
        headers: {
          ...authHeaders(),
          // DO NOT set Content-Type for FormData; browser sets boundary
        },
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status === 404) {
          lastErr = new Error(`404 on ${p}: ${txt}`);
          continue;
        }
        throw new Error(`POST ${p} failed (${res.status}): ${txt}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Upload failed");
}

function cleanupPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
}

/* ---------------- EVENTS ---------------- */
function onPick(e) {
  const f = e.target.files?.[0];
  if (!f) return;

  file.value = f;
  cleanupPreview();
  previewUrl.value = URL.createObjectURL(f);

  if (f.type.startsWith("image/")) pickedKind.value = "image";
  else if (f.type.startsWith("video/")) pickedKind.value = "video";
  else pickedKind.value = "";
}

function clearMedia() {
  file.value = null;
  pickedKind.value = "";
  cleanupPreview();
  if (fileInput.value) fileInput.value.value = "";
}

/* ---------------- SUBMIT ---------------- */
async function submit() {
  if (busy.value) return;

  if (!caption.value && !file.value) {
    status.value = "❌ Add text or choose a photo/video.";
    return;
  }

  busy.value = true;
  status.value = "⏳ Working…";

  try {
    // 1) Upload to Cloudinary via backend (if file exists)
    let image_url = "";
    let video_url = "";

    if (file.value) {
      status.value = "⏳ Uploading media…";

      const fd = new FormData();
      // backend can read "media" or "file" — we send both to be extra compatible
      fd.append("media", file.value);
      fd.append("file", file.value);

      // Try both route styles so it never 404
      const up = await postFormSmart("/api/upload", "/upload", fd);

      // Expect something like { url } or { secure_url } or { image_url/video_url }
      const url =
        up?.secure_url ||
        up?.url ||
        up?.image_url ||
        up?.video_url ||
        up?.data?.secure_url ||
        up?.data?.url ||
        "";

      if (!url || !String(url).startsWith("http")) {
        throw new Error(
          "Upload succeeded but no Cloudinary URL returned. Check upload.routes.js response."
        );
      }

      if (pickedKind.value === "image") image_url = url;
      if (pickedKind.value === "video") video_url = url;
    }

    // 2) Create post
    status.value = "⏳ Creating post…";

    // Your old code used { text: ... }
    // Your DB uses caption / image_url / video_url
    // We'll send both "text" and "caption" so it matches either backend version.
    const payload = {
      caption: caption.value || "",
      text: caption.value || "",
      image_url,
      video_url,
    };

    // Try both route styles so it never 404
    await postJSONSmart("/api/posts/create", "/posts/create", payload);

    status.value = "✅ Posted!";
    emit("posted"); // optional if you want to refresh feed from parent

    // reset
    caption.value = "";
    clearMedia();

    // auto close after a moment
    setTimeout(() => emitClose(), 350);
  } catch (err) {
    console.error(err);
    status.value = `❌ ${err?.message || "Failed"}`;
  } finally {
    busy.value = false;
  }
}

onBeforeUnmount(() => cleanupPreview());
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 9999;
}

.modal {
  width: min(760px, 96vw);
  background: rgba(20, 20, 28, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #ff3b3b;
  box-shadow: 0 0 18px rgba(255, 59, 59, 0.8);
}

.h1 {
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.2px;
}

.h2 {
  font-size: 12px;
  opacity: 0.75;
  color: #cfd3ff;
}

.x {
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
}

.label {
  display: block;
  margin: 14px 16px 8px;
  font-size: 12px;
  opacity: 0.8;
  color: #d8dcff;
}

.input {
  width: calc(100% - 32px);
  margin: 0 16px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.22);
  color: #fff;
  outline: none;
  resize: vertical;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px 0;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 1fr;
  }
}

.file {
  width: 100%;
  padding: 10px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.18);
  color: #fff;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.75;
  color: #cfd3ff;
}

.preview {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.18);
}

.previewTitle {
  font-size: 12px;
  opacity: 0.8;
  color: #d8dcff;
  margin-bottom: 8px;
}

.media {
  width: 100%;
  border-radius: 14px;
  display: block;
  background: rgba(255, 255, 255, 0.05);
}

.status {
  padding: 12px 16px 0;
}

.pill {
  display: inline-block;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.pill.ok {
  background: rgba(20, 200, 120, 0.18);
  border: 1px solid rgba(20, 200, 120, 0.28);
}

.pill.bad {
  background: rgba(255, 60, 60, 0.16);
  border: 1px solid rgba(255, 60, 60, 0.28);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px 16px;
}

.btn {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff3b3b, #ff7a18);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.08);
}

.mini {
  margin-top: 8px;
  border: 0;
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.mini.danger {
  background: rgba(255, 60, 60, 0.16);
  border: 1px solid rgba(255, 60, 60, 0.22);
}

.foot {
  padding: 0 16px 14px;
}

.tiny {
  font-size: 11px;
  opacity: 0.65;
  color: #cfd3ff;
}
</style>