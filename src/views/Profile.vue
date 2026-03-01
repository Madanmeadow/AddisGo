<template>
  <Layout>
    <div class="profile page">
      <!-- HEADER -->
      <div class="hero glass">
        <div class="heroBg"></div>

        <div class="heroTop">
          <div class="brand">
            <div class="brandIcon">🔥</div>
            <div class="brandText">
              <div class="brandTitle">Profile</div>
              <div class="brandSub">Your identity • stats • settings</div>
            </div>
          </div>

          <div class="actions">
            <button class="btnx" @click="refreshProfile">↻ Refresh</button>
            <button class="btnx danger" @click="logout">Logout</button>
          </div>
        </div>

        <div class="heroMain">
          <div class="avatarWrap">
            <div class="avatarRing"></div>
            <img
              class="avatar"
              :src="profile.avatarUrl || defaultAvatar"
              alt="avatar"
              @error="onAvatarError"
            />
            <label class="avatarEdit btnx" title="Change avatar">
              📷
              <input type="file" accept="image/*" @change="onPickAvatar" hidden />
            </label>
          </div>

          <div class="info">
            <div class="nameRow">
              <div class="name">{{ displayName }}</div>
              <span class="badge">@{{ username }}</span>
              <span v-if="online" class="status"><span class="pulse"></span> Online</span>
            </div>

            <div class="bio">
              {{ profile.bio || "Tell people about yourself. Add a short bio ✨" }}
            </div>

            <div class="stats">
              <div class="stat glassMini">
                <div class="num">{{ stats.posts }}</div>
                <div class="lab">Posts</div>
              </div>
              <div class="stat glassMini">
                <div class="num">{{ stats.reels }}</div>
                <div class="lab">Reels</div>
              </div>
              <div class="stat glassMini">
                <div class="num">{{ stats.followers }}</div>
                <div class="lab">Followers</div>
              </div>
              <div class="stat glassMini">
                <div class="num">{{ stats.following }}</div>
                <div class="lab">Following</div>
              </div>
            </div>

            <div class="ctaRow">
              <button class="btnx primary" @click="openEdit = true">Edit Profile</button>
              <button class="btnx" @click="copyLink">Share</button>
              <button class="btnx" @click="goInbox">Message</button>
            </div>
          </div>
        </div>

        <!-- TABS -->
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'about' }" @click="tab = 'about'">About</button>
          <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
          <button class="tab" :class="{ active: tab === 'reels' }" @click="tab = 'reels'">Reels</button>
          <button class="tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'">Settings</button>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="contentGrid">
        <div class="panel glass" v-if="tab === 'about'">
          <div class="panelTitle">About</div>

          <div class="kv">
            <div class="k">Email</div>
            <div class="v">{{ profile.email || "—" }}</div>
          </div>
          <div class="kv">
            <div class="k">Location</div>
            <div class="v">{{ profile.location || "—" }}</div>
          </div>
          <div class="kv">
            <div class="k">Joined</div>
            <div class="v">{{ joinedText }}</div>
          </div>

          <div class="divider"></div>

          <div class="panelTitle small">Highlights</div>
          <div class="chips">
            <span class="chip">🔥 AddisGo Creator</span>
            <span class="chip">🎥 Reels</span>
            <span class="chip">💬 Chat</span>
            <span class="chip">📞 Live Calls</span>
          </div>
        </div>

        <div class="panel glass" v-else-if="tab === 'posts'">
          <div class="panelTitle">Posts</div>
          <div class="empty">
            <div class="emptyIcon">📝</div>
            <div class="emptyTitle">Your posts will show here</div>
            <div class="emptySub">This page is ready. We can wire it to your existing posts feed next.</div>
            <button class="btnx primary" @click="goHome">Go Home</button>
          </div>
        </div>

        <div class="panel glass" v-else-if="tab === 'reels'">
          <div class="panelTitle">Reels</div>
          <div class="empty">
            <div class="emptyIcon">🎬</div>
            <div class="emptyTitle">Your reels will show here</div>
            <div class="emptySub">We can load reels by user_id without changing your backend structure.</div>
            <button class="btnx primary" @click="goHome">Go Home</button>
          </div>
        </div>

        <div class="panel glass" v-else>
          <div class="panelTitle">Settings</div>

          <div class="kv">
            <div class="k">Sound</div>
            <div class="v">
              <button class="btnx" @click="toggleSound">{{ soundOn ? "🔊 On" : "🔇 Off" }}</button>
            </div>
          </div>

          <div class="kv">
            <div class="k">Dark Mode</div>
            <div class="v">
              <span class="badge">Enabled ✅</span>
            </div>
          </div>

          <div class="divider"></div>

          <button class="btnx danger w100" @click="logout">Logout</button>
        </div>

        <!-- SIDE CARD -->
        <div class="side glass">
          <div class="panelTitle">Quick Actions</div>
          <button class="btnx w100" @click="goLive">🔴 Go Live</button>
          <button class="btnx w100" @click="goInbox">💬 Inbox</button>
          <button class="btnx w100" @click="goHome">🏠 Home</button>

          <div class="divider"></div>

          <div class="panelTitle small">Account</div>
          <div class="muted">
            Token: <span class="mono">{{ token ? "✅ present" : "❌ missing" }}</span>
          </div>
        </div>
      </div>

      <!-- EDIT MODAL -->
      <transition name="fade-up">
        <div v-if="openEdit" class="modalBack" @click.self="openEdit = false">
          <div class="modal glass">
            <div class="modalHead">
              <div class="modalTitle">Edit Profile</div>
              <button class="btnx" @click="openEdit = false">✕</button>
            </div>

            <div class="field">
              <label>Display name</label>
              <input v-model="edit.displayName" class="inp" placeholder="Your name" />
            </div>

            <div class="field">
              <label>Username</label>
              <input v-model="edit.username" class="inp" placeholder="@username" />
            </div>

            <div class="field">
              <label>Bio</label>
              <textarea v-model="edit.bio" class="inp ta" placeholder="Short bio..." />
            </div>

            <div class="field">
              <label>Location</label>
              <input v-model="edit.location" class="inp" placeholder="Minneapolis, MN" />
            </div>

            <div class="row">
              <button class="btnx" @click="openEdit = false">Cancel</button>
              <button class="btnx primary" @click="saveLocal">Save</button>
            </div>

            <div class="hint">
              ✅ This saves locally (safe). If you want, I can wire it to your backend when you tell me your users update route.
            </div>
          </div>
        </div>
      </transition>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const token = localStorage.getItem("token") || "";
const userLS = safeJSON(localStorage.getItem("user")) || safeJSON(localStorage.getItem("currentUser")) || null;

// profile data (safe defaults)
const profile = reactive({
  id: userLS?.id || userLS?.userId || "",
  displayName: userLS?.display_name || userLS?.displayName || userLS?.name || "AddisGo User",
  username: userLS?.username || userLS?.email?.split("@")?.[0] || "user",
  email: userLS?.email || "",
  avatarUrl: userLS?.avatar_url || userLS?.avatarUrl || "",
  bio: userLS?.bio || "",
  location: userLS?.location || "",
  createdAt: userLS?.created_at || userLS?.createdAt || "",
});

const stats = reactive({
  posts: userLS?.postsCount ?? 0,
  reels: userLS?.reelsCount ?? 0,
  followers: userLS?.followers ?? 0,
  following: userLS?.following ?? 0,
});

const tab = ref("about");
const openEdit = ref(false);
const soundOn = ref(localStorage.getItem("soundOn") !== "0");

const defaultAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
    <defs>
      <linearGradient id='g' x1='0' x2='1'>
        <stop offset='0' stop-color='#ff2a6d'/>
        <stop offset='1' stop-color='#5b8cff'/>
      </linearGradient>
    </defs>
    <rect width='200' height='200' rx='40' fill='url(#g)'/>
    <circle cx='100' cy='78' r='34' fill='rgba(255,255,255,.75)'/>
    <rect x='42' y='124' width='116' height='56' rx='28' fill='rgba(255,255,255,.55)'/>
  </svg>`);

const online = ref(true); // optional: wire to presence later

const displayName = computed(() => profile.displayName || "AddisGo User");
const username = computed(() => (profile.username || "user").replace("@", ""));

const joinedText = computed(() => {
  if (!profile.createdAt) return "—";
  const d = new Date(profile.createdAt);
  if (isNaN(d.getTime())) return profile.createdAt;
  return d.toLocaleDateString();
});

const edit = reactive({
  displayName: profile.displayName,
  username: profile.username,
  bio: profile.bio,
  location: profile.location,
});

// actions
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  router.push("/login");
}

function goHome() {
  router.push("/dashboard");
}
function goInbox() {
  router.push("/inbox");
}
function goLive() {
  router.push("/live");
}

function refreshProfile() {
  // safe: reload from localStorage only (no backend dependency)
  const u = safeJSON(localStorage.getItem("user")) || safeJSON(localStorage.getItem("currentUser"));
  if (!u) return;

  profile.displayName = u.display_name || u.displayName || u.name || profile.displayName;
  profile.username = u.username || u.email?.split("@")?.[0] || profile.username;
  profile.email = u.email || profile.email;
  profile.avatarUrl = u.avatar_url || u.avatarUrl || profile.avatarUrl;
  profile.bio = u.bio || profile.bio;
  profile.location = u.location || profile.location;
  profile.createdAt = u.created_at || u.createdAt || profile.createdAt;
}

function copyLink() {
  const link = window.location.origin + "/profile";
  navigator.clipboard?.writeText(link).catch(() => {});
}

function toggleSound() {
  soundOn.value = !soundOn.value;
  localStorage.setItem("soundOn", soundOn.value ? "1" : "0");
}

function onAvatarError(e) {
  e.target.src = defaultAvatar;
}

function onPickAvatar(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;

  // safe: local preview only (no backend required)
  const url = URL.createObjectURL(file);
  profile.avatarUrl = url;

  // store locally so it stays after refresh (optional)
  saveUserPatch({ avatarUrl: url, avatar_url: url });
}

function saveLocal() {
  profile.displayName = edit.displayName.trim() || profile.displayName;
  profile.username = (edit.username || profile.username).replace("@", "").trim();
  profile.bio = edit.bio;
  profile.location = edit.location;

  saveUserPatch({
    displayName: profile.displayName,
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
  });

  openEdit.value = false;
}

function saveUserPatch(patch) {
  const existing = safeJSON(localStorage.getItem("user")) || safeJSON(localStorage.getItem("currentUser")) || {};
  const merged = { ...existing, ...patch };
  // prefer storing in "user" but keep compatibility
  localStorage.setItem("user", JSON.stringify(merged));
  localStorage.setItem("currentUser", JSON.stringify(merged));
}

function safeJSON(v) {
  try { return v ? JSON.parse(v) : null; } catch { return null; }
}

onMounted(() => {
  refreshProfile();
});
</script>

<style scoped>
.page{ padding: 14px; }

.hero{
  position: relative;
  overflow: hidden;
  padding: 16px;
  border-radius: 22px;
}

.heroBg{
  position:absolute;
  inset:-2px;
  background:
    radial-gradient(700px 300px at 20% 0%, rgba(91,140,255,.20), transparent 55%),
    radial-gradient(700px 300px at 80% 10%, rgba(255,42,109,.18), transparent 55%),
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
  filter: blur(0px);
  pointer-events:none;
}

.heroTop{
  position: relative;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}

.brand{ display:flex; align-items:center; gap:12px; }
.brandIcon{
  width:42px; height:42px; border-radius:14px;
  display:grid; place-items:center;
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  box-shadow: 0 12px 30px rgba(91,140,255,.25);
}
.brandTitle{ font-weight:800; letter-spacing:.2px; }
.brandSub{ font-size:12px; opacity:.72; }

.actions{ display:flex; gap:10px; flex-wrap:wrap; }

.heroMain{
  position: relative;
  display:flex;
  gap:16px;
  margin-top: 14px;
  align-items: center;
}

.avatarWrap{
  position: relative;
  width: 112px; height: 112px;
  flex: 0 0 auto;
  display:grid;
  place-items:center;
}
.avatarRing{
  position:absolute;
  inset:-3px;
  border-radius: 28px;
  background: linear-gradient(90deg, rgba(255,42,109,.9), rgba(91,140,255,.9));
  filter: blur(.2px);
}
.avatar{
  position: relative;
  width: 112px; height: 112px;
  border-radius: 28px;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,.12);
  box-shadow: 0 22px 60px rgba(0,0,0,.55);
}

.avatarEdit{
  position:absolute;
  right:-6px; bottom:-6px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.40);
}

.info{ flex: 1; min-width: 0; }
.nameRow{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap: wrap;
}
.name{ font-size: 22px; font-weight: 900; }
.badge{
  padding:6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.10);
  opacity:.9;
}
.status{
  display:flex; align-items:center; gap:8px;
  padding:6px 10px;
  border-radius: 999px;
  background: rgba(53,227,161,.12);
  border:1px solid rgba(53,227,161,.22);
}
.pulse{
  width:10px; height:10px; border-radius:50%;
  background: #35e3a1;
  box-shadow: 0 0 0 0 rgba(53,227,161,.45);
  animation: pulse 1.4s infinite;
}
@keyframes pulse{ 0%{box-shadow:0 0 0 0 rgba(53,227,161,.45)} 70%{box-shadow:0 0 0 12px rgba(53,227,161,0)} 100%{box-shadow:0 0 0 0 rgba(53,227,161,0)} }

.bio{
  margin-top: 8px;
  opacity: .84;
  line-height: 1.35;
  max-width: 720px;
}

.stats{
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap:10px;
}
.glassMini{
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  padding:10px 12px;
}
.stat .num{ font-weight: 900; font-size: 18px; }
.stat .lab{ font-size: 12px; opacity: .7; }

.ctaRow{ margin-top: 12px; display:flex; gap:10px; flex-wrap:wrap; }

.tabs{
  position: relative;
  margin-top: 14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.tab{
  padding:10px 14px;
  border-radius: 999px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(233,236,255,.86);
  transition: transform .12s ease, background .2s ease, border-color .2s ease;
}
.tab:hover{ background: rgba(255,255,255,.10); }
.tab:active{ transform: scale(.98); }
.tab.active{
  border: none;
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  box-shadow: 0 12px 30px rgba(91,140,255,.24);
  color: white;
}

.contentGrid{
  margin-top: 14px;
  display:grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
}

.panel{
  padding: 16px;
  border-radius: 22px;
}
.panelTitle{
  font-weight: 900;
  font-size: 14px;
  letter-spacing: .2px;
  margin-bottom: 12px;
}
.panelTitle.small{ font-size: 12px; opacity:.8; }

.kv{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.k{ opacity:.7; font-size: 12px; }
.v{ font-weight: 700; opacity:.92; }

.divider{ height: 1px; background: rgba(255,255,255,.08); margin: 14px 0; }

.chips{ display:flex; gap:10px; flex-wrap:wrap; }
.chip{
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  font-size: 12px;
  opacity: .92;
}

.side{
  padding: 16px;
  border-radius: 22px;
  height: fit-content;
}
.muted{ opacity:.72; font-size: 12px; margin-top: 8px; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

.empty{
  height: 260px;
  display:grid;
  place-items:center;
  text-align:center;
  opacity: .92;
}
.emptyIcon{ font-size: 30px; }
.emptyTitle{ font-weight: 900; margin-top: 6px; }
.emptySub{ opacity:.7; font-size: 12px; max-width: 340px; margin-top: 6px; }

.w100{ width:100%; }
.btnx{ user-select:none; }
.btnx.primary{
  border: none;
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  color: white;
  box-shadow: 0 12px 30px rgba(91,140,255,.22);
}
.btnx.danger{
  background: rgba(255,0,70,.12);
  border:1px solid rgba(255,0,70,.22);
}

.modalBack{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display:grid;
  place-items:center;
  z-index: 9999;
  padding: 14px;
}
.modal{
  width: min(560px, 100%);
  border-radius: 22px;
  padding: 14px;
}
.modalHead{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap:12px;
  margin-bottom: 10px;
}
.modalTitle{ font-weight: 900; font-size: 14px; }

.field{ margin-top: 10px; }
.field label{ display:block; font-size: 12px; opacity:.75; margin-bottom: 6px; }
.inp{
  width:100%;
  padding: 12px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  color: rgba(233,236,255,.92);
  outline: none;
}
.ta{ min-height: 90px; resize: vertical; }

.row{ display:flex; gap:10px; justify-content:flex-end; margin-top: 12px; flex-wrap:wrap; }
.hint{ opacity:.7; font-size: 12px; margin-top: 10px; }

@media (max-width: 900px){
  .contentGrid{ grid-template-columns: 1fr; }
  .heroMain{ align-items:flex-start; }
  .stats{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>