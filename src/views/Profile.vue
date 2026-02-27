<template>
  <div class="profile-page">
    <div class="top">
      <button class="icon" @click="goBack">←</button>
      <div class="title">
        <div class="h1">Profile</div>
        <div class="sub">Your account</div>
      </div>
      <button class="done" @click="goBack">Done</button>
    </div>

    <div class="card">
      <div class="avatar-wrap">
        <img class="avatar" :src="previewAvatar || form.avatar_url || defaultAvatar" />
      </div>

      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPick" />
      <button class="btn" @click="fileInput?.click()">Change</button>

      <div class="field">
        <label>Name</label>
        <input v-model="form.display_name" placeholder="Your name" />
      </div>

      <div class="field">
        <label>Bio</label>
        <textarea v-model="form.bio" placeholder="Bio"></textarea>
      </div>

      <div class="actions">
        <button class="btn ghost" @click="copyLink">Copy link</button>
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="ok" class="ok">Saved ✅</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { apiFetch } from "../utils/apiFetch.js";

const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const fileInput = ref(null);
const pickedFile = ref(null);
const previewAvatar = ref("");
const saving = ref(false);
const error = ref("");
const ok = ref(false);

const defaultAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23222'/%3E%3Ctext x='50%25' y='55%25' font-size='64' fill='%23fff' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E";

const form = reactive({
  display_name: "",
  bio: "",
  avatar_url: "",
  id: null,
});

function goBack() {
  window.history.back();
}

function onPick(e) {
  error.value = "";
  ok.value = false;

  const f = e.target.files?.[0];
  if (!f) return;

  pickedFile.value = f;
  previewAvatar.value = URL.createObjectURL(f);
}

async function loadMe() {
  error.value = "";
  ok.value = false;

  const me = await apiFetch(`${apiUrl}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  form.id = me.id;
  form.display_name = me.display_name || me.username || "";
  form.bio = me.bio || "";
  form.avatar_url = me.avatar_url || "";
}

async function uploadAvatarIfNeeded() {
  if (!pickedFile.value) return form.avatar_url;

  const fd = new FormData();
  fd.append("file", pickedFile.value); // ✅ keep "file" because backend is .single("file")

  const up = await apiFetch(`${apiUrl}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  return up.url; // expects { url }
}

async function save() {
  saving.value = true;
  error.value = "";
  ok.value = false;

  try {
    // 1) upload image if changed
    const avatarUrl = await uploadAvatarIfNeeded();

    // 2) patch profile
    const payload = {
      display_name: form.display_name?.trim(),
      bio: form.bio?.trim(),
      avatar_url: avatarUrl || "",
    };

    const updated = await apiFetch(`${apiUrl}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // update UI
    form.display_name = updated.display_name || form.display_name;
    form.bio = updated.bio || form.bio;
    form.avatar_url = updated.avatar_url || avatarUrl || form.avatar_url;

    pickedFile.value = null;
    previewAvatar.value = "";
    ok.value = true;
  } catch (e) {
    // ✅ show clean message (NOT html dump)
    error.value = e?.message || "Save failed. Check Railway logs.";
    console.error("PROFILE SAVE ERROR:", e?.raw || e);
  } finally {
    saving.value = false;
  }
}

async function copyLink() {
  const url = `${window.location.origin}/u/${form.id || ""}`;
  try {
    await navigator.clipboard.writeText(url);
    ok.value = true;
    setTimeout(() => (ok.value = false), 1200);
  } catch {
    error.value = "Copy not allowed on this device.";
  }
}

onMounted(() => {
  if (!apiUrl) {
    error.value = "VITE_API_URL is missing.";
    return;
  }
  if (!token) {
    error.value = "Login again to edit profile.";
    return;
  }
  loadMe().catch((e) => {
    error.value = e?.message || "Failed to load profile.";
    console.error("LOAD ME ERROR:", e?.raw || e);
  });
});
</script>

<style scoped>
.profile-page { min-height: 100vh; padding: 16px; background: #0b1220; color: #fff; }
.top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.icon { width:44px; height:44px; border-radius:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.10); color:#fff; }
.title { flex:1; text-align:center; }
.h1 { font-size:26px; font-weight:800; }
.sub { opacity:.7; font-size:13px; margin-top:2px; }
.done { padding:10px 16px; border-radius:16px; border:0; color:#fff; background:linear-gradient(90deg,#ff3b6b,#ff6a3d); }

.card { max-width:520px; margin:0 auto; padding:16px; border-radius:22px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); }
.avatar-wrap { display:flex; justify-content:center; margin:10px 0 12px; }
.avatar { width:160px; height:160px; object-fit:cover; border-radius:26px;
  border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.25); }

.hidden { display:none; }

.btn { width:100%; padding:14px 14px; border-radius:18px; border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.08); color:#fff; }
.btn.primary { background:linear-gradient(90deg,#ff3b6b,#ff6a3d); border:0; }
.btn.ghost { background:rgba(255,255,255,.08); }

.field { margin-top:12px; }
.field label { display:block; font-size:12px; opacity:.75; margin-bottom:6px; }
.field input, .field textarea {
  width:100%; padding:14px; border-radius:16px;
  border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.25); color:#fff;
}
.field textarea { min-height:90px; resize:none; }

.actions { display:flex; gap:12px; margin-top:14px; }
.actions .btn { width:50%; }

.error { margin-top:14px; padding:12px; border-radius:16px; background:rgba(255,30,80,.12); border:1px solid rgba(255,30,80,.25); }
.ok { margin-top:14px; padding:12px; border-radius:16px; background:rgba(50,220,120,.12); border:1px solid rgba(50,220,120,.25); }
</style>