<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="back" @click="router.back()">←</button>
        <div>
          <div class="h1">Profile</div>
          <div class="sub">Your account</div>
        </div>
        <button class="done" @click="save" :disabled="saving">
          {{ saving ? "Saving…" : "Done" }}
        </button>
      </header>

      <section class="card">
        <!-- AVATAR -->
        <div class="avatarBox">
          <div class="avatar">
            <img v-if="avatarPreview" :src="avatarPreview" alt="avatar" />
            <div v-else class="fallback">{{ initial }}</div>
          </div>

          <label class="changeBtn">
            Change
            <input type="file" accept="image/*" @change="onPickAvatar" />
          </label>
        </div>

        <!-- NAME -->
        <input class="name" v-model="displayName" placeholder="Display name" />
        <div class="id">User #{{ me?.id || "?" }}</div>

        <!-- BIO -->
        <textarea class="bio" v-model="bio" placeholder="Bio"></textarea>

        <!-- ACTIONS -->
        <div class="row">
          <button class="ghost" @click="copyLink">🔗 Copy link</button>
          <button class="save" @click="save" :disabled="saving">
            {{ saving ? "Saving…" : "Save" }}
          </button>
        </div>

        <div v-if="err" class="err">{{ err }}</div>
        <div v-if="ok" class="ok">{{ ok }}</div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const displayName = ref(me?.display_name || me?.username || "");
const bio = ref(me?.bio || "");
const avatarUrl = ref(me?.avatar_url || me?.photo_url || ""); // saved URL in DB
const avatarPreview = ref(avatarUrl.value || ""); // what we show immediately on iPhone

const pickedFile = ref(null);

const saving = ref(false);
const err = ref("");
const ok = ref("");

const initial = computed(() => (displayName.value?.[0] || "A").toUpperCase());

function onPickAvatar(e) {
  err.value = "";
  ok.value = "";
  const file = e.target.files?.[0];
  if (!file) return;

  pickedFile.value = file;

  // ✅ iPhone-safe preview
  try {
    avatarPreview.value = URL.createObjectURL(file);
  } catch {
    avatarPreview.value = "";
  }
}

async function uploadAvatarIfNeeded() {
  if (!pickedFile.value) return avatarUrl.value; // no change

  if (!token) throw new Error("Login again to upload.");

  const form = new FormData();
  // IMPORTANT: your backend may expect "file" or "image"
  // Try "file" first (most common). If your upload route expects "image", change it.
  form.append("file", pickedFile.value);

  const res = await fetch(`${apiUrl}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Upload failed");

  // Accept multiple possible response shapes:
  const url =
    data?.url ||
    data?.secure_url ||
    data?.fileUrl ||
    data?.imageUrl ||
    data?.path;

  if (!url || typeof url !== "string") {
    throw new Error("Upload succeeded but no URL returned.");
  }

  // Must be a valid http(s) url OR a server path like "/uploads/xxx.jpg"
  avatarUrl.value = url.startsWith("http") ? url : `${apiUrl}${url}`;
  return avatarUrl.value;
}

async function save() {
  err.value = "";
  ok.value = "";

  try {
    saving.value = true;

    const finalAvatar = await uploadAvatarIfNeeded();

    // ✅ Update profile in DB
    // Change this endpoint if yours differs.
    const res = await fetch(`${apiUrl}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        display_name: displayName.value,
        bio: bio.value,
        avatar_url: finalAvatar,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to save profile");

    // ✅ Update localStorage user so Dashboard shows it
    const merged = { ...(me || {}), ...data, display_name: displayName.value, bio: bio.value, avatar_url: finalAvatar };
    localStorage.setItem("user", JSON.stringify(merged));

    ok.value = "Saved ✅";
    pickedFile.value = null;
  } catch (e) {
    err.value = e?.message || "Something went wrong.";
  } finally {
    saving.value = false;
  }
}

async function copyLink() {
  const url = `${window.location.origin}/profile/${me?.id || ""}`;
  try {
    await navigator.clipboard.writeText(url);
    ok.value = "Copied ✅";
  } catch {
    ok.value = url;
  }
}
</script>

<style scoped>
.wrap { padding: 16px; color: white; }
.top{
  display:flex; align-items:center; justify-content:space-between;
  gap: 12px; margin-bottom: 12px;
}
.h1{ font-size: 22px; font-weight: 950; }
.sub{ opacity:.7; font-size: 13px; }
.back{
  border:none; background: rgba(255,255,255,0.10); color:white;
  padding: 10px 12px; border-radius: 14px; cursor:pointer;
}
.done{
  border:none; color:white; cursor:pointer;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  padding: 10px 14px; border-radius: 999px;
}
.done:disabled{ opacity:.6; }

.card{
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 16px;
  backdrop-filter: blur(10px);
}

.avatarBox{ display:grid; justify-items:center; gap: 12px; margin-bottom: 14px; }
.avatar{
  width: 150px; height: 150px;
  border-radius: 28px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.14);
  overflow:hidden;
  display:grid; place-items:center;
}
.avatar img{ width:100%; height:100%; object-fit:cover; }
.fallback{ font-size: 54px; font-weight: 950; }

.changeBtn{
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 14px; border-radius: 999px;
  cursor:pointer;
}
.changeBtn input{ display:none; }

.name{
  width:100%;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 12px;
  border-radius: 14px;
  outline:none;
  font-size: 16px;
  font-weight: 800;
}
.id{ opacity:.7; margin-top: 8px; }

.bio{
  width:100%;
  margin-top: 12px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 12px;
  border-radius: 14px;
  outline:none;
  min-height: 92px;
}

.row{ display:flex; gap: 10px; margin-top: 14px; }
.ghost{
  flex:1;
  border:none; cursor:pointer;
  background: rgba(255,255,255,0.10);
  color:white;
  padding: 12px;
  border-radius: 14px;
}
.save{
  flex:1;
  border:none; cursor:pointer;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  color:white;
  padding: 12px;
  border-radius: 14px;
}
.err{
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255,80,80,0.18);
  border: 1px solid rgba(255,80,80,0.35);
}
.ok{
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,230,118,0.12);
  border: 1px solid rgba(0,230,118,0.25);
}
</style>