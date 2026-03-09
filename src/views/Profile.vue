<template>
  <Layout>
    <div class="profilePage">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>

      <!-- HERO -->
      <section class="hero glass">
        <div class="heroTop">
          <div class="brand">
            <div class="brandIcon">🔥</div>
            <div>
              <div class="brandTitle">Profile</div>
              <div class="brandSub">Your identity • stats • settings</div>
            </div>
          </div>

          <div class="topActions">
            <button class="btn ghost" @click="refreshProfile">↻ Refresh</button>
            <button class="btn danger" @click="logout">Logout</button>
          </div>
        </div>

        <div class="heroMain">
          <div class="avatarWrap">
            <div class="avatarGlow"></div>

            <img
              class="avatar"
              :src="profile.avatarUrl || defaultAvatar"
              alt="avatar"
              @error="onAvatarError"
            />

            <label class="avatarEdit" title="Change avatar">
              📷
              <input type="file" accept="image/*" hidden @change="onPickAvatar" />
            </label>
          </div>

          <div class="identity">
            <div class="nameRow">
              <h1 class="displayName">{{ displayName }}</h1>
              <span v-if="online" class="onlinePill">
                <span class="onlineDot"></span>
                Online
              </span>
            </div>

            <div class="usernameRow">
              <span class="username">@{{ username }}</span>
            </div>

            <p class="bio">
              {{ profile.bio || "Tell people about yourself. Add a short bio ✨" }}
            </p>

            <div class="stats">
              <div class="statCard">
                <div class="statNum">{{ stats.posts }}</div>
                <div class="statLabel">Posts</div>
              </div>
              <div class="statCard">
                <div class="statNum">{{ stats.reels }}</div>
                <div class="statLabel">Reels</div>
              </div>
              <div class="statCard">
                <div class="statNum">{{ stats.followers }}</div>
                <div class="statLabel">Followers</div>
              </div>
              <div class="statCard">
                <div class="statNum">{{ stats.following }}</div>
                <div class="statLabel">Following</div>
              </div>
            </div>

            <div class="actionRow">
              <button class="btn primary" @click="openEdit = true">Edit Profile</button>
              <button class="btn ghost" @click="copyLink">Share</button>
              <button class="btn ghost" @click="goInbox">Message</button>
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
      </section>

      <!-- TAB CONTENT -->
      <section class="content glass">
        <template v-if="tab === 'about'">
          <h2 class="sectionTitle">About</h2>

          <div class="infoList">
            <div class="infoRow">
              <span class="infoKey">Email</span>
              <span class="infoVal">{{ profile.email || "—" }}</span>
            </div>

            <div class="infoRow">
              <span class="infoKey">Location</span>
              <span class="infoVal">{{ profile.location || "—" }}</span>
            </div>

            <div class="infoRow">
              <span class="infoKey">Joined</span>
              <span class="infoVal">{{ joinedText }}</span>
            </div>
          </div>

          <div class="divider"></div>

          <h3 class="sectionSub">Highlights</h3>
          <div class="chips">
            <span class="chip">🔥 AddisGo Creator</span>
            <span class="chip">🎬 Reels</span>
            <span class="chip">💬 Chat</span>
            <span class="chip">📞 Live Calls</span>
          </div>
        </template>

        <template v-else-if="tab === 'posts'">
          <h2 class="sectionTitle">Posts</h2>
          <div class="emptyBox">
            <div class="emptyIcon">📝</div>
            <div class="emptyTitle">Your posts will show here</div>
            <div class="emptySub">We can wire this to your real posts next.</div>
            <button class="btn primary" @click="goHome">Go Home</button>
          </div>
        </template>

        <template v-else-if="tab === 'reels'">
          <h2 class="sectionTitle">Reels</h2>
          <div class="emptyBox">
            <div class="emptyIcon">🎥</div>
            <div class="emptyTitle">Your reels will show here</div>
            <div class="emptySub">We can connect this to your reels feed too.</div>
            <button class="btn primary" @click="goHome">Go Home</button>
          </div>
        </template>

        <template v-else>
          <h2 class="sectionTitle">Settings</h2>

          <div class="settingsList">
            <div class="infoRow">
              <span class="infoKey">Sound</span>
              <button class="btn ghost smallBtn" @click="toggleSound">
                {{ soundOn ? "🔊 On" : "🔇 Off" }}
              </button>
            </div>

            <div class="infoRow">
              <span class="infoKey">Dark Mode</span>
              <span class="infoVal">Enabled ✅</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="bottomActions">
            <button class="btn ghost" @click="goLive">🔴 Go Live</button>
            <button class="btn ghost" @click="goInbox">💬 Inbox</button>
            <button class="btn ghost" @click="goHome">🏠 Home</button>
            <button class="btn danger fullBtn" @click="logout">Logout</button>
          </div>
        </template>
      </section>

      <!-- EDIT MODAL -->
      <transition name="fade-up">
        <div v-if="openEdit" class="modalBack" @click.self="openEdit = false">
          <div class="modal glass">
            <div class="modalHead">
              <div class="modalTitle">Edit Profile</div>
              <button class="btn ghost smallBtn" @click="openEdit = false">✕</button>
            </div>

            <div class="field">
              <label>Display name</label>
              <input v-model="edit.displayName" class="inputField" placeholder="Your name" />
            </div>

            <div class="field">
              <label>Username</label>
              <input v-model="edit.username" class="inputField" placeholder="@username" />
            </div>

            <div class="field">
              <label>Bio</label>
              <textarea v-model="edit.bio" class="inputField textareaField" placeholder="Short bio..." />
            </div>

            <div class="field">
              <label>Location</label>
              <input v-model="edit.location" class="inputField" placeholder="Minneapolis, MN" />
            </div>

            <div class="modalActions">
              <button class="btn ghost" @click="openEdit = false">Cancel</button>
              <button class="btn primary" @click="saveLocal">Save</button>
            </div>

            <div class="hint">
              This saves locally for now. Later we can connect it to your backend update route.
            </div>
          </div>
        </div>
      </transition>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

const token = localStorage.getItem("token") || ""
const userLS =
  safeJSON(localStorage.getItem("user")) ||
  safeJSON(localStorage.getItem("currentUser")) ||
  null

const profile = reactive({
  id: userLS?.id || userLS?.userId || "",
  displayName: userLS?.display_name || userLS?.displayName || userLS?.name || "AddisGo User",
  username: userLS?.username || userLS?.email?.split("@")?.[0] || "user",
  email: userLS?.email || "",
  avatarUrl: userLS?.avatar_url || userLS?.avatarUrl || "",
  bio: userLS?.bio || "",
  location: userLS?.location || "",
  createdAt: userLS?.created_at || userLS?.createdAt || "",
})

const stats = reactive({
  posts: userLS?.postsCount ?? 0,
  reels: userLS?.reelsCount ?? 0,
  followers: userLS?.followers ?? 0,
  following: userLS?.following ?? 0,
})

const tab = ref("about")
const openEdit = ref(false)
const soundOn = ref(localStorage.getItem("soundOn") !== "0")
const online = ref(true)

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
  </svg>`)

const displayName = computed(() => profile.displayName || "AddisGo User")
const username = computed(() => (profile.username || "user").replace("@", ""))

const joinedText = computed(() => {
  if (!profile.createdAt) return "—"
  const d = new Date(profile.createdAt)
  if (isNaN(d.getTime())) return profile.createdAt
  return d.toLocaleDateString()
})

const edit = reactive({
  displayName: profile.displayName,
  username: profile.username,
  bio: profile.bio,
  location: profile.location,
})

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  localStorage.removeItem("currentUser")
  router.push("/login")
}

function goHome() {
  router.push("/dashboard")
}

function goInbox() {
  router.push("/messages")
}

function goLive() {
  router.push("/live")
}

function refreshProfile() {
  const u =
    safeJSON(localStorage.getItem("user")) ||
    safeJSON(localStorage.getItem("currentUser"))

  if (!u) return

  profile.displayName = u.display_name || u.displayName || u.name || profile.displayName
  profile.username = u.username || u.email?.split("@")?.[0] || profile.username
  profile.email = u.email || profile.email
  profile.avatarUrl = u.avatar_url || u.avatarUrl || profile.avatarUrl
  profile.bio = u.bio || profile.bio
  profile.location = u.location || profile.location
  profile.createdAt = u.created_at || u.createdAt || profile.createdAt

  edit.displayName = profile.displayName
  edit.username = profile.username
  edit.bio = profile.bio
  edit.location = profile.location
}

async function copyLink() {
  const id = profile.id ? String(profile.id) : ""
  const link = `${window.location.origin}/profile/${id}`
  try {
    await navigator.clipboard.writeText(link)
    alert("Profile link copied!")
  } catch {
    alert(link)
  }
}

function toggleSound() {
  soundOn.value = !soundOn.value
  localStorage.setItem("soundOn", soundOn.value ? "1" : "0")
}

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

function onPickAvatar(ev) {
  const file = ev.target.files?.[0]
  if (!file) return

  const url = URL.createObjectURL(file)
  profile.avatarUrl = url

  saveUserPatch({
    avatarUrl: url,
    avatar_url: url,
  })
}

function saveLocal() {
  profile.displayName = edit.displayName.trim() || profile.displayName
  profile.username = (edit.username || profile.username).replace("@", "").trim()
  profile.bio = edit.bio
  profile.location = edit.location

  saveUserPatch({
    displayName: profile.displayName,
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
  })

  openEdit.value = false
}

function saveUserPatch(patch) {
  const existing =
    safeJSON(localStorage.getItem("user")) ||
    safeJSON(localStorage.getItem("currentUser")) ||
    {}

  const merged = { ...existing, ...patch }

  localStorage.setItem("user", JSON.stringify(merged))
  localStorage.setItem("currentUser", JSON.stringify(merged))
}

function safeJSON(v) {
  try {
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

onMounted(() => {
  refreshProfile()
})
</script>

<style scoped>
.profilePage {
  position: relative;
  min-height: 100vh;
  padding: 14px;
  color: white;
  background:
    radial-gradient(1000px 600px at 20% 0%, rgba(255,75,43,0.14), transparent),
    radial-gradient(900px 600px at 80% 10%, rgba(91,140,255,0.14), transparent),
    linear-gradient(180deg, #09111f 0%, #0b1220 45%, #07101d 100%);
  overflow: hidden;
}

.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.3;
}

.orb1 {
  width: 260px;
  height: 260px;
  left: -60px;
  top: 60px;
  background: rgba(255, 65, 108, 0.35);
}

.orb2 {
  width: 280px;
  height: 280px;
  right: -60px;
  top: 200px;
  background: rgba(91, 140, 255, 0.32);
}

.glass {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(14px);
  box-shadow:
    0 12px 40px rgba(0,0,0,0.26),
    inset 0 1px 0 rgba(255,255,255,0.04);
  border-radius: 24px;
}

.hero {
  padding: 16px;
}

.heroTop {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brandIcon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ff2a6d, #5b8cff);
  box-shadow: 0 12px 30px rgba(91,140,255,.25);
}

.brandTitle {
  font-size: 18px;
  font-weight: 900;
}

.brandSub {
  font-size: 13px;
  opacity: 0.74;
}

.topActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.heroMain {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 18px;
  align-items: start;
}

.avatarWrap {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatarGlow {
  position: absolute;
  inset: -5px;
  border-radius: 30px;
  background: linear-gradient(135deg, #ff2a6d, #5b8cff);
  filter: blur(6px);
  opacity: 0.6;
}

.avatar {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 28px;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.08);
}

.avatarEdit {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: rgba(20, 28, 44, 0.82);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 10px 24px rgba(0,0,0,0.28);
}

.identity {
  min-width: 0;
}

.nameRow {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.displayName {
  margin: 0;
  font-size: 22px;
  font-weight: 950;
}

.onlinePill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(53,227,161,.12);
  border: 1px solid rgba(53,227,161,.22);
  font-weight: 800;
}

.onlineDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #35e3a1;
}

.usernameRow {
  margin-top: 8px;
}

.username {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.10);
  font-weight: 700;
  opacity: .92;
}

.bio {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.45;
  opacity: .9;
  max-width: 720px;
}

.stats {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 12px;
}

.statCard {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}

.statNum {
  font-size: 28px;
  font-weight: 950;
}

.statLabel {
  margin-top: 4px;
  font-size: 13px;
  opacity: .72;
}

.actionRow {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tabs {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.86);
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
}

.tab.active {
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 30px rgba(91,140,255,.22);
}

.content {
  margin-top: 14px;
  padding: 18px;
}

.sectionTitle {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 950;
}

.sectionSub {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 900;
  opacity: .92;
}

.infoList,
.settingsList {
  display: grid;
  gap: 6px;
}

.infoRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.infoKey {
  opacity: .74;
  font-size: 14px;
}

.infoVal {
  font-weight: 800;
  text-align: right;
}

.divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 18px 0;
}

.chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
}

.emptyBox {
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 8px;
}

.emptyIcon {
  font-size: 32px;
}

.emptyTitle {
  font-size: 18px;
  font-weight: 900;
}

.emptySub {
  opacity: .72;
}

.bottomActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 11px 16px;
  color: white;
  cursor: pointer;
  font-weight: 800;
  background: rgba(255,255,255,0.10);
}

.btn.primary {
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  box-shadow: 0 12px 30px rgba(91,140,255,.22);
}

.btn.ghost {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
}

.btn.danger {
  background: rgba(255,0,70,.14);
  border: 1px solid rgba(255,0,70,.24);
}

.smallBtn {
  padding: 9px 12px;
}

.fullBtn {
  width: 100%;
}

.modalBack {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0,0,0,.56);
  display: grid;
  place-items: center;
  padding: 14px;
}

.modal {
  width: min(560px, 100%);
  padding: 16px;
}

.modalHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.modalTitle {
  font-size: 18px;
  font-weight: 900;
}

.field {
  margin-top: 10px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  opacity: .78;
}

.inputField {
  width: 100%;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: white;
  border-radius: 14px;
  padding: 12px 14px;
  outline: none;
}

.textareaField {
  min-height: 100px;
  resize: vertical;
}

.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  opacity: .72;
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
}

@media (max-width: 700px) {
  .heroTop {
    flex-direction: column;
    align-items: flex-start;
  }

  .heroMain {
    grid-template-columns: 1fr;
  }

  .avatarWrap {
    margin: 0 auto;
  }

  .identity {
    text-align: center;
  }

  .nameRow,
  .actionRow,
  .tabs,
  .chips,
  .bottomActions {
    justify-content: center;
  }

  .usernameRow {
    display: flex;
    justify-content: center;
  }

  .infoRow {
    flex-direction: column;
    align-items: flex-start;
  }

  .infoVal {
    text-align: left;
  }
}
</style>