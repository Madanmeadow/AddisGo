<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="back" @click="goBack">←</button>
        <div class="title">
          <div class="h1">Profile</div>
          <div class="sub">{{ viewingMe ? "Your account" : "Public profile" }}</div>
        </div>
        <button v-if="viewingMe" class="btn primary" @click="toggleEdit">
          {{ editing ? "Done" : "Edit" }}
        </button>
      </header>

      <section class="card">
        <div class="hero">
          <div class="avatar">
            <img v-if="profile.avatar_url" :src="media(profile.avatar_url)" alt="avatar" />
            <div v-else class="avatar-fallback">{{ initial }}</div>

            <label v-if="viewingMe && editing" class="avatar-upload">
              <input type="file" accept="image/*" @change="pickAvatar" />
              Change
            </label>
          </div>

          <div class="meta">
            <div class="nameRow">
              <div v-if="!editing" class="name">{{ profile.display_name || "User" }}</div>
              <input
                v-else
                v-model="draft.display_name"
                class="input"
                placeholder="Display name"
                maxlength="40"
              />
            </div>

            <div class="id">User #{{ profile.id }}</div>

            <div v-if="!editing" class="bio">
              {{ profile.bio || "No bio yet." }}
            </div>
            <textarea
              v-else
              v-model="draft.bio"
              class="textarea"
              placeholder="Write a short bio…"
              maxlength="160"
              rows="3"
            ></textarea>

            <div class="actions">
              <button class="btn" @click="copyLink">🔗 Copy link</button>

              <button v-if="!viewingMe" class="btn" @click="goMessage">💬 Message</button>
              <button v-if="!viewingMe" class="btn" @click="call('audio')">📞 Call</button>
              <button v-if="!viewingMe" class="btn" @click="call('video')">🎥 Video</button>

              <button
                v-if="viewingMe && editing"
                class="btn primary"
                :disabled="saving"
                @click="save"
              >
                {{ saving ? "Saving…" : "Save" }}
              </button>
            </div>

            <div v-if="err" class="err">{{ err }}</div>
            <div v-if="hint" class="hint">{{ hint }}</div>
          </div>
        </div>
      </section>

      <!-- (Optional) Later: user posts grid/list -->
      <section class="card soft">
        <div class="sectionTitle">Next</div>
        <div class="sectionText">
          We can add: user posts feed, media grid, followers, and “call/message” presence here.
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const router = useRouter();
const route = useRoute();

const me = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();
const routeId = String(route.params.id || "").trim();
const viewingMe = computed(() => !routeId || String(me?.id) === routeId);

const profile = ref({ id: routeId || me?.id, display_name: "", bio: "", avatar_url: "" });

const editing = ref(false);
const saving = ref(false);
const err = ref("");
const hint = ref("");

const draft = ref({ display_name: "", bio: "", avatar_url: "" });

const initial = computed(() => String(profile.value.display_name || "A")[0]?.toUpperCase?.() || "A");

function media(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${apiUrl}${url}`;
}

function goBack() { router.back(); }

function toggleEdit() {
  editing.value = !editing.value;
  if (editing.value) {
    draft.value = {
      display_name: profile.value.display_name || "",
      bio: profile.value.bio || "",
      avatar_url: profile.value.avatar_url || "",
    };
  }
}

async function loadProfile() {
  err.value = "";
  hint.value = "";

  try {
    if (viewingMe.value) {
      if (!token) return (err.value = "Login again to view your profile.");
      const res = await fetch(`${apiUrl}/users/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      profile.value = data || profile.value;
    } else {
      const res = await fetch(`${apiUrl}/users/${routeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      profile.value = data || profile.value;
    }
  } catch (e) {
    err.value = e?.message || "Failed to load profile";
  }
}

async function pickAvatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!token) return alert("Login again.");

  err.value = "";
  hint.value = "Uploading avatar…";

  try {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch(`${apiUrl}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");

    // Expect your upload route returns { url } or { imageUrl }
    const url = data?.url || data?.imageUrl || data?.image_url;
    if (!url) throw new Error("Upload response missing url");

    draft.value.avatar_url = url;
    hint.value = "Avatar uploaded. Press Save.";
  } catch (e) {
    err.value = e?.message || "Avatar upload failed";
    hint.value = "";
  }
}

async function save() {
  if (!token) return alert("Login again.");
  saving.value = true;
  err.value = "";
  hint.value = "";

  try {
    const res = await fetch(`${apiUrl}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        display_name: draft.value.display_name,
        bio: draft.value.bio,
        avatar_url: draft.value.avatar_url,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Save failed");

    profile.value = data;
    editing.value = false;
    hint.value = "Saved ✅";
  } catch (e) {
    err.value = e?.message || "Save failed";
  } finally {
    saving.value = false;
  }
}

async function copyLink() {
  const url = `${window.location.origin}/profile/${profile.value.id}`;
  try {
    await navigator.clipboard.writeText(url);
    hint.value = "Profile link copied ✅";
    setTimeout(() => (hint.value = ""), 1200);
  } catch {
    alert(url);
  }
}

/* Hooks to your existing features */
function goMessage() {
  // if you already have inbox route, go there (safe fallback)
  router.push("/inbox");
}

function call(kind) {
  // we don’t start call from here yet (because your call flow is on Dashboard People panel)
  // but we can route back to dashboard and you can call from people list.
  alert(`Go to Dashboard → People → ${kind} call (next we’ll add direct call button here).`);
}

onMounted(loadProfile);
</script>

<style scoped>
.wrap{
  min-height: 100vh;
  padding: 16px;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.18), transparent),
    radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.16), transparent),
    #0b1220;
  color: white;
}
.top{
  display:flex;
  align-items:center;
  gap: 12px;
  max-width: 1100px;
  margin: 0 auto 14px;
}
.back{
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  color:white;
  border-radius: 14px;
  padding: 10px 12px;
  cursor:pointer;
}
.title{ flex:1; }
.h1{ font-weight: 950; font-size: 18px; }
.sub{ opacity:.7; font-size: 12px; margin-top: 2px; }

.card{
  max-width: 1100px;
  margin: 0 auto 14px;
  border-radius: 18px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
}
.card.soft{
  background: rgba(255,255,255,0.06);
}
.hero{
  display:flex;
  gap: 14px;
  align-items:flex-start;
}
.avatar{
  width: 120px;
  height: 120px;
  border-radius: 22px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  display:grid;
  place-items:center;
  position: relative;
}
.avatar img{
  width:100%;
  height:100%;
  object-fit: cover;
}
.avatar-fallback{
  font-weight: 950;
  font-size: 34px;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  width: 100%;
  height: 100%;
  display:grid;
  place-items:center;
}
.avatar-upload{
  position:absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  text-align:center;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.14);
  cursor:pointer;
  font-weight: 900;
  font-size: 12px;
}
.avatar-upload input{ display:none; }

.meta{ flex:1; min-width: 0; }
.nameRow{ display:flex; align-items:center; gap: 10px; }
.name{ font-weight: 950; font-size: 22px; }
.id{ opacity:.7; font-size: 12px; margin-top: 4px; }

.bio{ margin-top: 10px; line-height: 1.55; opacity: .95; }

.actions{ margin-top: 12px; display:flex; gap: 10px; flex-wrap: wrap; }
.btn{
  border:none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor:pointer;
  background: rgba(255,255,255,0.12);
  color:white;
}
.btn.primary{
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  font-weight: 950;
}

.input, .textarea{
  width: 100%;
  border: 1px solid rgba(255,255,255,0.12);
  outline:none;
  background: rgba(0,0,0,0.35);
  color:white;
  border-radius: 14px;
  padding: 10px 12px;
}
.textarea{ margin-top: 10px; resize:none; }

.err{
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,0.18);
  border: 1px solid rgba(255,80,80,0.35);
}
.hint{
  margin-top: 10px;
  opacity:.8;
  font-size: 13px;
}
.sectionTitle{ font-weight: 950; }
.sectionText{ opacity:.8; margin-top: 6px; }

@media (max-width: 760px){
  .hero{ flex-direction: column; }
  .avatar{ width: 110px; height: 110px; }
}
</style>