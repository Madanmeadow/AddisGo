<template>
  <Layout>
    <div class="pwrap">
      <header class="ptop">
        <div class="left">
          <div class="avatar">
            <img v-if="form.avatar_url" :src="getMedia(form.avatar_url)" alt="avatar" />
            <div v-else class="placeholder">👤</div>
          </div>

          <div class="meta">
            <div class="name">{{ form.display_name || "Your Name" }}</div>
            <div class="sub">{{ form.email || "—" }}</div>
          </div>
        </div>

        <div class="right">
          <button class="chip ghost" @click="refresh" :disabled="loading">
            ↻ {{ loading ? "Loading…" : "Refresh" }}
          </button>
          <button class="chip" @click="save" :disabled="saving">
            💾 {{ saving ? "Saving…" : "Save" }}
          </button>
        </div>
      </header>

      <section class="card">
        <div class="row">
          <label>Display name</label>
          <input v-model="form.display_name" placeholder="e.g. Madan ra" />
        </div>

        <div class="row">
          <label>Email</label>
          <input v-model="form.email" placeholder="you@email.com" />
        </div>

        <div class="row">
          <label>Username</label>
          <input v-model="form.username" placeholder="@username" />
        </div>

        <div class="row">
          <label>Bio</label>
          <textarea v-model="form.bio" rows="3" placeholder="Tell people about you…" />
        </div>

        <div class="grid2">
          <div class="row">
            <label>Phone</label>
            <input v-model="form.phone" placeholder="(optional)" />
          </div>
          <div class="row">
            <label>Location</label>
            <input v-model="form.location" placeholder="Minneapolis" />
          </div>
        </div>

        <div class="grid2">
          <div class="row">
            <label>Country</label>
            <input v-model="form.country" placeholder="USA" />
          </div>
          <div class="row">
            <label>Website</label>
            <input v-model="form.website" placeholder="https://…" />
          </div>
        </div>

        <div class="uploadBox">
          <div class="uploadLeft">
            <div class="uTitle">Profile picture</div>
            <div class="uSub">Uploads to Cloudinary (won’t disappear after deploy).</div>
          </div>

          <div class="uploadRight">
            <input ref="fileEl" type="file" accept="image/*" @change="onPickAvatar" />
            <button class="chip" @click="openPicker">🖼️ Choose</button>
          </div>
        </div>

        <div v-if="msg" class="msg">{{ msg }}</div>
        <div v-if="err" class="err">{{ err }}</div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import api from "../api/http"; // keep your existing axios wrapper
import { getMedia } from "../utils/media"; // your getMedia helper

const loading = ref(false);
const saving = ref(false);
const msg = ref("");
const err = ref("");

const fileEl = ref(null);

const form = reactive({
  display_name: "",
  email: "",
  username: "",
  bio: "",
  avatar_url: "",
  phone: "",
  location: "",
  country: "",
  website: "",
});

function toast(text, isErr = false) {
  msg.value = isErr ? "" : text;
  err.value = isErr ? text : "";
  setTimeout(() => {
    msg.value = "";
    err.value = "";
  }, 2500);
}

async function refresh() {
  loading.value = true;
  try {
    const res = await api.get("/api/users/me");
    Object.assign(form, res.data || {});
  } catch (e) {
    console.error(e);
    toast(e?.response?.data?.error || e.message || "Failed to load profile", true);
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const res = await api.put("/api/users/me", { ...form });
    Object.assign(form, res.data || {});
    toast("Saved ✅");
  } catch (e) {
    console.error(e);
    toast(e?.response?.data?.error || e.message || "Failed to save", true);
  } finally {
    saving.value = false;
  }
}

function openPicker() {
  fileEl.value?.click();
}

async function onPickAvatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    // upload to Cloudinary via your backend
    const fd = new FormData();
    fd.append("media", file);

    const up = await api.post("/api/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!up.data?.url) throw new Error("Upload did not return url");
    form.avatar_url = up.data.url;

    // auto-save avatar immediately
    await save();
  } catch (ex) {
    console.error(ex);
    toast(ex?.response?.data?.error || ex.message || "Avatar upload failed", true);
  } finally {
    // reset file input so picking same file again works
    if (fileEl.value) fileEl.value.value = "";
  }
}

onMounted(refresh);
</script>

<style scoped>
.pwrap { max-width: 920px; margin: 0 auto; padding: 18px; }
.ptop { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; }
.left { display:flex; align-items:center; gap:12px; }
.avatar { width:64px; height:64px; border-radius:18px; overflow:hidden; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); }
.avatar img { width:100%; height:100%; object-fit:cover; display:block; }
.placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:26px; opacity:.9; }
.meta .name { font-size:18px; font-weight:800; }
.meta .sub { opacity:.75; font-size:13px; margin-top:2px; }
.right { display:flex; gap:10px; flex-wrap:wrap; }

.card { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:18px; padding:16px; }
.row { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
label { font-size:12px; opacity:.75; }
input, textarea {
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  padding:10px 12px;
  color:inherit;
  outline:none;
}
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width: 720px){ .grid2 { grid-template-columns:1fr; } }

.uploadBox {
  margin-top:10px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:12px;
  border-radius:14px;
  border:1px dashed rgba(255,255,255,.14);
  background:rgba(0,0,0,.16);
}
.uTitle { font-weight:800; }
.uSub { opacity:.75; font-size:12px; margin-top:2px; }
.uploadRight { display:flex; align-items:center; gap:10px; }
.uploadRight input { display:none; }

.chip {
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.07);
  color:inherit;
  padding:10px 12px;
  border-radius:999px;
  cursor:pointer;
}
.chip.ghost { background:transparent; }

.msg { margin-top:10px; padding:10px 12px; border-radius:12px; background:rgba(0,255,120,.10); border:1px solid rgba(0,255,120,.18); }
.err { margin-top:10px; padding:10px 12px; border-radius:12px; background:rgba(255,70,70,.12); border:1px solid rgba(255,70,70,.22); }
</style>