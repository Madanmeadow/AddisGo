<template>
  <Layout>
    <div class="profilePage">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-grid"></div>

      <section class="hero glass">
        <div class="heroTop">
          <div class="brand">
            <div class="brandIcon">🔥</div>
            <div>
              <div class="brandTitle">Profile Studio</div>
              <div class="brandSub">Identity • creator stats • posts • reels</div>
            </div>
          </div>

          <div class="topActions">
            <span class="statusPill" :class="{ offline: !isOnlineNow }">
              <span class="statusDot"></span>
              {{ isOnlineNow ? (syncing ? 'Syncing' : 'Online') : 'Offline' }}
            </span>
            <button class="btn ghost" @click="refreshAll" :disabled="loading">{{ loading ? 'Loading…' : '↻ Refresh' }}</button>
            <button class="btn danger" @click="logout">Logout</button>
          </div>
        </div>

        <div class="heroMain">
          <div class="avatarBlock">
            <div class="coverCard">
              <div class="coverGlow"></div>
              <div class="avatarWrap">
                <div class="avatarGlow"></div>
                <img class="avatar" :src="profile.avatarUrl || defaultAvatar" alt="avatar" @error="onAvatarError" />
                <label class="avatarEdit" title="Change avatar">
                  📷
                  <input type="file" accept="image/*" hidden @change="onPickAvatar" />
                </label>
              </div>

              <div class="miniBadges">
                <span class="miniBadge">{{ creatorLevel }}</span>
                <span class="miniBadge ghost">{{ stats.posts }} Posts</span>
              </div>
            </div>
          </div>

          <div class="identity">
            <div class="nameRow">
              <h1 class="displayName">{{ displayName }}</h1>
              <span class="onlinePill" :class="{ offline: !isOnlineNow }">
                <span class="onlineDot"></span>
                {{ isOnlineNow ? 'Online' : 'Offline' }}
              </span>
            </div>

            <div class="usernameRow">
              <span class="username">@{{ username }}</span>
              <span v-if="profile.location" class="locationPill">📍 {{ profile.location }}</span>
              <span v-if="joinedText !== '—'" class="locationPill ghost">🗓 {{ joinedText }}</span>
            </div>

            <p class="bio">{{ profile.bio || 'Tell people about yourself. Add a short bio ✨' }}</p>

            <div class="quickFacts">
              <div class="fact glassMini">
                <div class="factLabel">Email</div>
                <div class="factValue">{{ profile.email || 'Add email' }}</div>
              </div>
              <div class="fact glassMini">
                <div class="factLabel">Location</div>
                <div class="factValue">{{ profile.location || 'Add location' }}</div>
              </div>
              <div class="fact glassMini">
                <div class="factLabel">Joined</div>
                <div class="factValue">{{ joinedText }}</div>
              </div>
            </div>

            <div class="stats">
              <button class="statCard" @click="tab = 'posts'">
                <div class="statNum">{{ stats.posts }}</div>
                <div class="statLabel">Posts</div>
              </button>
              <button class="statCard" @click="tab = 'reels'">
                <div class="statNum">{{ stats.reels }}</div>
                <div class="statLabel">Reels</div>
              </button>
              <button class="statCard" @click="tab = 'about'">
                <div class="statNum">{{ stats.followers }}</div>
                <div class="statLabel">Followers</div>
              </button>
              <button class="statCard" @click="tab = 'about'">
                <div class="statNum">{{ stats.following }}</div>
                <div class="statLabel">Following</div>
              </button>
            </div>

            <div class="actionRow">
              <button class="btn primary" @click="openEdit = true">Edit Profile</button>
              <button class="btn ghost" @click="copyLink">Share</button>
              <button class="btn ghost" @click="goInbox">Message</button>
              <button class="btn ghost" @click="goLive">Go Live</button>
              <button class="btn ghost" @click="goHome">Home</button>
            </div>
          </div>
        </div>

        <div class="featureRail">
          <button class="featureChip" :class="{ active: tab === 'about' }" @click="tab = 'about'">About</button>
          <button class="featureChip" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
          <button class="featureChip" :class="{ active: tab === 'reels' }" @click="tab = 'reels'">Reels</button>
          <button class="featureChip" :class="{ active: tab === 'saved' }" @click="tab = 'saved'">Saved</button>
          <button class="featureChip" :class="{ active: tab === 'settings' }" @click="tab = 'settings'">Settings</button>
        </div>
      </section>

      <section class="gridZone">
        <section class="content glass mainContent">
          <template v-if="tab === 'about'">
            <h2 class="sectionTitle">About</h2>
            <div class="aboutGrid">
              <div class="aboutCard glassMini">
                <div class="infoKey">Display name</div>
                <div class="infoVal big">{{ displayName }}</div>
              </div>
              <div class="aboutCard glassMini">
                <div class="infoKey">Username</div>
                <div class="infoVal big">@{{ username }}</div>
              </div>
              <div class="aboutCard glassMini">
                <div class="infoKey">Email</div>
                <div class="infoVal">{{ profile.email || '—' }}</div>
              </div>
              <div class="aboutCard glassMini">
                <div class="infoKey">Location</div>
                <div class="infoVal">{{ profile.location || '—' }}</div>
              </div>
              <div class="aboutCard glassMini">
                <div class="infoKey">Joined</div>
                <div class="infoVal">{{ joinedText }}</div>
              </div>
              <div class="aboutCard glassMini">
                <div class="infoKey">Bio</div>
                <div class="infoVal multiline">{{ profile.bio || 'No bio yet.' }}</div>
              </div>
            </div>

            <div class="divider"></div>

            <h3 class="sectionSub">Highlights</h3>
            <div class="chips">
              <span class="chip">🔥 {{ creatorLevel }}</span>
              <span class="chip">🎬 {{ stats.reels }} Reels</span>
              <span class="chip">💬 Chat Ready</span>
              <span class="chip">📞 Live Calls</span>
              <span class="chip">⚡ Pulse / AddisGo</span>
            </div>
          </template>

          <template v-else-if="tab === 'posts'">
            <div class="sectionHead">
              <h2 class="sectionTitle">Posts</h2>
              <span class="sectionMeta">{{ userPosts.length }} item{{ userPosts.length === 1 ? '' : 's' }}</span>
            </div>

            <div v-if="loading" class="state">Loading posts…</div>
            <div v-else-if="userPosts.length === 0" class="emptyBox">
              <div class="emptyIcon">📝</div>
              <div class="emptyTitle">No posts yet</div>
              <div class="emptySub">Create your first post and your profile will light up.</div>
              <button class="btn primary" @click="goHome">Create from Dashboard</button>
            </div>
            <div v-else class="postList">
              <article v-for="post in userPosts" :key="`post-${post.id}`" class="postCard glassMini">
                <div class="postHead">
                  <div>
                    <div class="postTitle">{{ firstLine(post.caption) || 'Untitled post' }}</div>
                    <div class="postTime">{{ formatDate(post.created_at || post.createdAt) }}</div>
                  </div>
                  <span class="miniBadge ghost">{{ post.video_url ? 'Video' : post.image_url ? 'Image' : 'Text' }}</span>
                </div>
                <div v-if="post.caption" class="postText clamp2">{{ post.caption }}</div>
                <img v-if="post.image_url" class="postMedia" :src="mediaUrl(post.image_url)" loading="lazy" />
                <video v-else-if="post.video_url" class="postMedia" :src="mediaUrl(post.video_url)" controls playsinline preload="metadata"></video>
              </article>
            </div>
          </template>

          <template v-else-if="tab === 'reels'">
            <div class="sectionHead">
              <h2 class="sectionTitle">Reels</h2>
              <span class="sectionMeta">{{ userReels.length }} reel{{ userReels.length === 1 ? '' : 's' }}</span>
            </div>

            <div v-if="loading" class="state">Loading reels…</div>
            <div v-else-if="userReels.length === 0" class="emptyBox">
              <div class="emptyIcon">🎥</div>
              <div class="emptyTitle">No reels yet</div>
              <div class="emptySub">Post short videos and they will show here.</div>
              <button class="btn primary" @click="goHome">Open Dashboard</button>
            </div>
            <div v-else class="reelsGrid">
              <article v-for="reel in userReels" :key="`reel-${reel.id}`" class="reelCard glassMini">
                <video class="reelVideo" :src="mediaUrl(reel.video_url)" controls playsinline preload="metadata"></video>
                <div class="reelInfo">
                  <div class="postTitle clamp1">{{ firstLine(reel.caption) || 'My reel' }}</div>
                  <div class="postTime">{{ formatDate(reel.created_at || reel.createdAt) }}</div>
                </div>
              </article>
            </div>
          </template>

          <template v-else-if="tab === 'saved'">
            <div class="sectionHead">
              <h2 class="sectionTitle">Saved</h2>
              <span class="sectionMeta">Private library</span>
            </div>
            <div class="emptyBox">
              <div class="emptyIcon">💾</div>
              <div class="emptyTitle">Saved items can live here</div>
              <div class="emptySub">Connect this later to your dashboard saved-post IDs.</div>
            </div>
          </template>

          <template v-else>
            <h2 class="sectionTitle">Settings</h2>
            <div class="settingsList">
              <div class="infoRow">
                <span class="infoKey">Sound</span>
                <button class="btn ghost smallBtn" @click="toggleSound">{{ soundOn ? '🔊 On' : '🔇 Off' }}</button>
              </div>
              <div class="infoRow">
                <span class="infoKey">Realtime profile sync</span>
                <span class="infoVal">{{ syncing ? 'Working…' : 'Ready ✅' }}</span>
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

        <aside class="sidePanel glass">
          <div class="panelTitle">Profile Power</div>
          <div class="powerScore">{{ powerScore }}</div>
          <div class="panelSub">Your creator profile score based on activity and setup.</div>

          <div class="sideStats">
            <div class="sideStat glassMini">
              <span>Profile completion</span>
              <strong>{{ completionPercent }}%</strong>
            </div>
            <div class="sideStat glassMini">
              <span>Latest post</span>
              <strong>{{ latestPostText }}</strong>
            </div>
            <div class="sideStat glassMini">
              <span>Main mode</span>
              <strong>{{ userReels.length ? 'Video creator' : 'Text creator' }}</strong>
            </div>
          </div>

          <div class="divider"></div>

          <div class="panelTitle small">Quick Actions</div>
          <div class="sideActions">
            <button class="btn ghost fullBtn" @click="goHome">Create Post</button>
            <button class="btn ghost fullBtn" @click="goLive">Start Live</button>
            <button class="btn ghost fullBtn" @click="goInbox">Open Inbox</button>
            <button class="btn primary fullBtn" @click="openEdit = true">Update Profile</button>
          </div>
        </aside>
      </section>

      <transition name="fade-up">
        <div v-if="openEdit" class="modalBack" @click.self="openEdit = false">
          <div class="modal glass">
            <div class="modalHead">
              <div class="modalTitle">Edit Profile</div>
              <button class="btn ghost smallBtn" @click="openEdit = false">✕</button>
            </div>

            <div class="editGrid">
              <div class="field">
                <label>Display name</label>
                <input v-model="edit.displayName" class="inputField" placeholder="Your name" />
              </div>

              <div class="field">
                <label>Username</label>
                <input v-model="edit.username" class="inputField" placeholder="@username" />
              </div>

              <div class="field fieldWide">
                <label>Bio</label>
                <textarea v-model="edit.bio" class="inputField textareaField" placeholder="Short bio..."></textarea>
              </div>

              <div class="field">
                <label>Email</label>
                <input v-model="edit.email" class="inputField" placeholder="you@example.com" />
              </div>

              <div class="field">
                <label>Location</label>
                <input v-model="edit.location" class="inputField" placeholder="Minneapolis, MN" />
              </div>
            </div>

            <div class="modalActions">
              <button class="btn ghost" @click="openEdit = false">Cancel</button>
              <button class="btn primary" @click="saveProfile">Save</button>
            </div>

            <div class="hint">This version saves locally first and also tries to sync with your backend if a matching update route exists.</div>
          </div>
        </div>
      </transition>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const token = localStorage.getItem('token') || ''

const profile = reactive({
  id: '',
  displayName: 'AddisGo User',
  username: 'user',
  email: '',
  avatarUrl: '',
  bio: '',
  location: '',
  createdAt: '',
})

const stats = reactive({
  posts: 0,
  reels: 0,
  followers: 0,
  following: 0,
})

const tab = ref('about')
const openEdit = ref(false)
const soundOn = ref(localStorage.getItem('soundOn') !== '0')
const isOnlineNow = ref(navigator.onLine)
const loading = ref(false)
const syncing = ref(false)
const allPosts = ref([])

const edit = reactive({
  displayName: '',
  username: '',
  bio: '',
  email: '',
  location: '',
})

const defaultAvatar =
  'data:image/svg+xml;utf8,' +
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

const displayName = computed(() => profile.displayName || 'AddisGo User')
const username = computed(() => String(profile.username || 'user').replace('@', ''))

const joinedText = computed(() => {
  if (!profile.createdAt) return '—'
  const d = new Date(profile.createdAt)
  if (Number.isNaN(d.getTime())) return String(profile.createdAt)
  return d.toLocaleDateString()
})

const userPosts = computed(() => {
  return allPosts.value.filter((p) => String(resolvePostUserId(p)) === String(profile.id || '') && !p.video_url)
})

const userReels = computed(() => {
  return allPosts.value.filter((p) => String(resolvePostUserId(p)) === String(profile.id || '') && !!p.video_url)
})

const completionPercent = computed(() => {
  const fields = [
    !!profile.displayName,
    !!profile.username,
    !!profile.bio,
    !!profile.email,
    !!profile.location,
    !!profile.avatarUrl,
    !!profile.createdAt,
  ]
  const done = fields.filter(Boolean).length
  return Math.round((done / fields.length) * 100)
})

const powerScore = computed(() => {
  return (
    completionPercent.value +
    stats.posts * 8 +
    stats.reels * 12 +
    stats.followers * 2 +
    stats.following
  )
})

const creatorLevel = computed(() => {
  if (powerScore.value >= 220) return 'Elite Creator'
  if (powerScore.value >= 120) return 'Rising Creator'
  return 'New Creator'
})

const latestPostText = computed(() => {
  const first = [...allPosts.value]
    .filter((p) => String(resolvePostUserId(p)) === String(profile.id || ''))
    .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))[0]
  if (!first) return 'No posts yet'
  return formatDate(first.created_at || first.createdAt)
})

function safeJSON(v) {
  try {
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

function loadLocalUser() {
  const user = safeJSON(localStorage.getItem('user')) || safeJSON(localStorage.getItem('currentUser')) || {}

  profile.id = user.id || user.userId || profile.id || ''
  profile.displayName = user.display_name || user.displayName || user.name || profile.displayName
  profile.username = user.username || user.email?.split('@')?.[0] || profile.username
  profile.email = user.email || profile.email
  profile.avatarUrl = user.avatar_url || user.avatarUrl || profile.avatarUrl
  profile.bio = user.bio || profile.bio
  profile.location = user.location || profile.location
  profile.createdAt = user.created_at || user.createdAt || profile.createdAt

  stats.posts = Number(user.postsCount ?? stats.posts ?? 0)
  stats.reels = Number(user.reelsCount ?? stats.reels ?? 0)
  stats.followers = Number(user.followers ?? 0)
  stats.following = Number(user.following ?? 0)

  edit.displayName = profile.displayName
  edit.username = profile.username
  edit.bio = profile.bio
  edit.email = profile.email
  edit.location = profile.location
}

async function fetchProfileRemote() {
  if (!token || !profile.id) return
  syncing.value = true
  const tryUrls = [
    `${apiBase}/users/${profile.id}`,
    `${apiBase}/api/users/${profile.id}`,
    `${apiBase}/profile/${profile.id}`,
    `${apiBase}/me`,
  ]

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) continue
      const data = await res.json()
      const u = data?.user || data || {}
      patchProfileFromUser(u)
      saveUserPatch(u)
      break
    } catch {
      // ignore and try next
    }
  }
  syncing.value = false
}

async function fetchPostsRemote() {
  try {
    const res = await fetch(`${apiBase}/posts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('posts fetch failed')
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.posts || []
    allPosts.value = list
    stats.posts = userPosts.value.length
    stats.reels = userReels.value.length
  } catch {
    const cached = safeJSON(localStorage.getItem('posts')) || []
    allPosts.value = Array.isArray(cached) ? cached : []
    stats.posts = userPosts.value.length
    stats.reels = userReels.value.length
  }
}

function patchProfileFromUser(u = {}) {
  profile.id = u.id || u.userId || profile.id
  profile.displayName = u.display_name || u.displayName || u.name || profile.displayName
  profile.username = u.username || u.email?.split('@')?.[0] || profile.username
  profile.email = u.email || profile.email
  profile.avatarUrl = u.avatar_url || u.avatarUrl || profile.avatarUrl
  profile.bio = u.bio || profile.bio
  profile.location = u.location || profile.location
  profile.createdAt = u.created_at || u.createdAt || profile.createdAt

  stats.followers = Number(u.followers ?? stats.followers ?? 0)
  stats.following = Number(u.following ?? stats.following ?? 0)

  edit.displayName = profile.displayName
  edit.username = profile.username
  edit.bio = profile.bio
  edit.email = profile.email
  edit.location = profile.location
}

function saveUserPatch(patch) {
  const existing = safeJSON(localStorage.getItem('user')) || safeJSON(localStorage.getItem('currentUser')) || {}
  const merged = { ...existing, ...patch }
  localStorage.setItem('user', JSON.stringify(merged))
  localStorage.setItem('currentUser', JSON.stringify(merged))
}

async function saveProfile() {
  profile.displayName = edit.displayName.trim() || profile.displayName
  profile.username = (edit.username || profile.username).replace('@', '').trim()
  profile.bio = edit.bio?.trim() || ''
  profile.email = edit.email?.trim() || ''
  profile.location = edit.location?.trim() || ''

  const payload = {
    id: profile.id,
    displayName: profile.displayName,
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    email: profile.email,
    location: profile.location,
    avatarUrl: profile.avatarUrl,
    avatar_url: profile.avatarUrl,
  }

  saveUserPatch(payload)
  openEdit.value = false

  if (!token || !profile.id) return

  syncing.value = true
  const tryUrls = [
    `${apiBase}/users/${profile.id}`,
    `${apiBase}/api/users/${profile.id}`,
    `${apiBase}/profile/${profile.id}`,
  ]

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) break
    } catch {
      // keep local save
    }
  }
  syncing.value = false
}

async function onPickAvatar(ev) {
  const file = ev.target.files?.[0]
  if (!file) return

  const localUrl = URL.createObjectURL(file)
  profile.avatarUrl = localUrl
  saveUserPatch({ avatarUrl: localUrl, avatar_url: localUrl })

  if (!token || !profile.id) return

  const formData = new FormData()
  formData.append('avatar', file)
  formData.append('file', file)

  syncing.value = true
  const tryUrls = [
    `${apiBase}/users/${profile.id}/avatar`,
    `${apiBase}/api/users/${profile.id}/avatar`,
    `${apiBase}/upload/avatar`,
    `${apiBase}/upload`,
  ]

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) continue
      const data = await res.json()
      const remoteUrl = data?.avatar_url || data?.avatarUrl || data?.url || ''
      if (remoteUrl) {
        profile.avatarUrl = remoteUrl
        saveUserPatch({ avatarUrl: remoteUrl, avatar_url: remoteUrl })
      }
      break
    } catch {
      // keep local preview if backend route missing
    }
  }
  syncing.value = false
}

function resolvePostUserId(post) {
  return post.user_id ?? post.author_id ?? post.user?.id ?? ''
}

function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) return path
  return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`
}

function firstLine(text) {
  return String(text || '').split('\n')[0].trim()
}

function formatDate(value) {
  if (!value) return 'Recently'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function toggleSound() {
  soundOn.value = !soundOn.value
  localStorage.setItem('soundOn', soundOn.value ? '1' : '0')
}

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

async function copyLink() {
  const id = profile.id ? String(profile.id) : ''
  const link = `${window.location.origin}/profile/${id}`
  try {
    await navigator.clipboard.writeText(link)
    alert('Profile link copied!')
  } catch {
    alert(link)
  }
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('currentUser')
  router.push('/login')
}

function goHome() {
  router.push('/dashboard')
}

function goInbox() {
  router.push('/messages')
}

function goLive() {
  router.push('/live')
}

async function refreshAll() {
  loading.value = true
  loadLocalUser()
  await fetchProfileRemote()
  await fetchPostsRemote()
  loading.value = false
}

function onOnline() {
  isOnlineNow.value = true
}

function onOffline() {
  isOnlineNow.value = false
}

onMounted(async () => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  await refreshAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
.profilePage {
  position: relative;
  min-height: 100vh;
  padding: 16px;
  color: white;
  background:
    radial-gradient(1000px 620px at 10% 0%, rgba(255, 75, 120, 0.16), transparent),
    radial-gradient(1000px 680px at 100% 0%, rgba(91, 140, 255, 0.18), transparent),
    linear-gradient(180deg, #07101c 0%, #091423 42%, #060d19 100%);
  overflow: hidden;
}
.bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(to bottom, rgba(255,255,255,.22), transparent 70%);
}
.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.34;
}
.orb1 {
  width: 260px;
  height: 260px;
  left: -60px;
  top: 90px;
  background: rgba(255, 65, 108, 0.35);
}
.orb2 {
  width: 300px;
  height: 300px;
  right: -80px;
  top: 220px;
  background: rgba(91, 140, 255, 0.32);
}
.glass,
.glassMini {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.11);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 44px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04);
}
.glass {
  position: relative;
  z-index: 2;
  border-radius: 28px;
}
.glassMini {
  border-radius: 20px;
}
.hero {
  padding: 18px;
}
.heroTop,
.heroMain,
.gridZone {
  position: relative;
  z-index: 2;
}
.heroTop {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brandIcon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 30px;
  background: linear-gradient(135deg, #ff2a6d, #5b8cff);
  box-shadow: 0 14px 30px rgba(91,140,255,.22);
}
.brandTitle {
  font-size: 20px;
  font-weight: 950;
}
.brandSub {
  opacity: .76;
}
.topActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.statusPill,
.onlinePill,
.locationPill,
.username,
.miniBadge,
.featureChip,
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
}
.statusPill,
.onlinePill {
  padding: 10px 16px;
  background: rgba(53,227,161,.12);
  border: 1px solid rgba(53,227,161,.22);
  font-weight: 800;
}
.statusPill.offline,
.onlinePill.offline {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.12);
}
.statusDot,
.onlineDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #35e3a1;
}
.statusPill.offline .statusDot,
.onlinePill.offline .onlineDot {
  background: #9aa4b2;
}
.heroMain {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 18px;
  margin-top: 18px;
}
.coverCard {
  position: relative;
  min-height: 260px;
  border-radius: 28px;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(180px 120px at 15% 10%, rgba(255,255,255,.12), transparent),
    linear-gradient(135deg, rgba(255,42,109,.35), rgba(91,140,255,.35));
  border: 1px solid rgba(255,255,255,.14);
}
.coverGlow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.16), transparent 55%);
}
.avatarWrap {
  position: relative;
  width: 152px;
  height: 152px;
  margin: 18px auto 0;
}
.avatarGlow {
  position: absolute;
  inset: -7px;
  border-radius: 34px;
  background: linear-gradient(135deg, #ff2a6d, #5b8cff);
  filter: blur(12px);
  opacity: .55;
}
.avatar {
  position: relative;
  width: 152px;
  height: 152px;
  border-radius: 34px;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.08);
}
.avatarEdit {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: rgba(20, 28, 44, 0.82);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 12px 24px rgba(0,0,0,0.28);
  z-index: 3;
}
.miniBadges {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}
.miniBadge,
.username,
.locationPill,
.chip,
.featureChip {
  padding: 10px 14px;
  background: rgba(255,255,255,.09);
  border: 1px solid rgba(255,255,255,.12);
  font-weight: 800;
}
.miniBadge.ghost,
.locationPill.ghost {
  background: rgba(255,255,255,.06);
}
.identity {
  min-width: 0;
}
.nameRow,
.usernameRow,
.actionRow,
.featureRail,
.chips,
.bottomActions,
.sideActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.displayName {
  margin: 0;
  font-size: 38px;
  font-weight: 950;
  line-height: 1.02;
}
.usernameRow {
  margin-top: 10px;
}
.bio {
  margin: 16px 0 0;
  font-size: 16px;
  line-height: 1.55;
  opacity: .94;
  max-width: 900px;
}
.quickFacts {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 12px;
}
.fact {
  padding: 14px;
}
.factLabel,
.infoKey {
  font-size: 13px;
  opacity: .72;
}
.factValue,
.infoVal {
  margin-top: 6px;
  font-weight: 800;
}
.factValue {
  font-size: 15px;
}
.stats {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 12px;
}
.statCard {
  padding: 16px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 20px;
  background: rgba(255,255,255,.06);
  color: white;
  cursor: pointer;
  text-align: left;
}
.statNum {
  font-size: 34px;
  font-weight: 950;
}
.statLabel {
  margin-top: 4px;
  font-size: 13px;
  opacity: .72;
}
.actionRow {
  margin-top: 16px;
}
.featureRail {
  margin-top: 18px;
}
.featureChip {
  cursor: pointer;
  color: rgba(255,255,255,.9);
}
.featureChip.active {
  background: linear-gradient(90deg, #ff2a6d, #5b8cff);
  border-color: transparent;
  box-shadow: 0 10px 28px rgba(91,140,255,.20);
}
.gridZone {
  display: grid;
  grid-template-columns: minmax(0,1fr) 320px;
  gap: 14px;
  margin-top: 14px;
}
.content,
.sidePanel {
  padding: 18px;
}
.sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sectionTitle {
  margin: 0 0 14px;
  font-size: 28px;
  font-weight: 950;
}
.sectionSub {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 900;
}
.sectionMeta,
.panelSub,
.emptySub,
.postTime,
.hint {
  opacity: .72;
}
.aboutGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
.aboutCard {
  padding: 16px;
}
.infoVal.big {
  font-size: 20px;
}
.multiline {
  white-space: pre-wrap;
  line-height: 1.5;
}
.divider {
  height: 1px;
  background: rgba(255,255,255,.08);
  margin: 18px 0;
}
.emptyBox,
.state {
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 8px;
}
.emptyIcon {
  font-size: 32px;
}
.emptyTitle,
.postTitle,
.panelTitle {
  font-weight: 900;
}
.postList,
.reelsGrid,
.settingsList,
.sideStats {
  display: grid;
  gap: 12px;
}
.postCard,
.reelCard,
.sideStat {
  padding: 14px;
}
.postHead,
.infoRow,
.modalHead,
.modalActions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.postText {
  margin-top: 10px;
  line-height: 1.5;
}
.postMedia,
.reelVideo {
  width: 100%;
  border-radius: 18px;
  margin-top: 12px;
  background: rgba(255,255,255,.05);
}
.postMedia {
  max-height: 420px;
  object-fit: cover;
}
.reelsGrid {
  grid-template-columns: repeat(2, minmax(0,1fr));
}
.reelVideo {
  aspect-ratio: 9 / 14;
  object-fit: cover;
}
.reelInfo {
  margin-top: 10px;
}
.clamp1,
.clamp2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.clamp1 { -webkit-line-clamp: 1; }
.clamp2 { -webkit-line-clamp: 2; }
.sidePanel {
  height: fit-content;
  position: sticky;
  top: 12px;
}
.powerScore {
  font-size: 52px;
  font-weight: 950;
  margin-top: 10px;
}
.sideStat {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  width: min(780px, 100%);
  padding: 16px;
}
.modalTitle {
  font-size: 18px;
  font-weight: 900;
}
.editGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
.fieldWide {
  grid-column: 1 / -1;
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
  min-height: 110px;
  resize: vertical;
}
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all .22s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 1100px) {
  .gridZone {
    grid-template-columns: 1fr;
  }
  .sidePanel {
    position: static;
  }
}
@media (max-width: 900px) {
  .heroMain,
  .quickFacts,
  .aboutGrid,
  .editGrid,
  .stats,
  .reelsGrid {
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
  .heroMain {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px) {
  .heroTop {
    flex-direction: column;
    align-items: flex-start;
  }
  .displayName {
    font-size: 30px;
  }
  .identity {
    text-align: center;
  }
  .nameRow,
  .usernameRow,
  .actionRow,
  .featureRail,
  .chips,
  .bottomActions,
  .sideActions {
    justify-content: center;
  }
  .avatarWrap {
    margin-inline: auto;
  }
  .quickFacts,
  .stats,
  .aboutGrid,
  .editGrid,
  .reelsGrid {
    grid-template-columns: 1fr;
  }
  .sectionHead,
  .infoRow,
  .modalHead,
  .modalActions {
    flex-direction: column;
    align-items: flex-start;
  }
  .statCard {
    text-align: center;
  }
}
</style>
