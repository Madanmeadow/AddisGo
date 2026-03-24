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
              <div class="brandSub">
                {{ isOwnProfile ? "Identity • creator stats • posts • reels" : "Public profile • posts • reels • connect" }}
              </div>
            </div>
          </div>

          <div class="topActions">
            <span class="statusPill" :class="{ offline: !isOnlineNow }">
              <span class="statusDot"></span>
              {{ isOnlineNow ? (syncing ? "Syncing" : "Online") : "Offline" }}
            </span>

            <button class="btn ghost" @click="refreshAll" :disabled="loading">
              {{ loading ? "Loading…" : "↻ Refresh" }}
            </button>

            <template v-if="isOwnProfile">
              <button class="btn danger" @click="logout">Logout</button>
            </template>

            <template v-else>
              <button class="btn primary" @click="toggleFollow">
                {{ isFollowing ? "Following" : "Follow" }}
              </button>
            </template>
          </div>
        </div>

        <div class="heroMain">
          <div class="avatarBlock">
            <div class="coverCard" :style="coverStyle">
              <div class="coverGlow"></div>

              <div class="avatarWrap">
                <div class="avatarGlow"></div>
                <img
                  class="avatar"
                  :src="profile.avatarUrl || defaultAvatar"
                  alt="avatar"
                  @error="onAvatarError"
                />

                <label
                  v-if="isOwnProfile"
                  class="avatarEdit"
                  title="Change avatar"
                >
                  📷
                  <input type="file" accept="image/*" hidden @change="onPickAvatar" />
                </label>
              </div>

              <div class="miniBadges">
                <span class="miniBadge">{{ creatorLevel }}</span>
                <span class="miniBadge ghost">{{ stats.posts }} Posts</span>
                <span v-if="stats.reels > 0" class="miniBadge ghost">{{ stats.reels }} Reels</span>
              </div>
            </div>
          </div>

          <div class="identity">
            <div class="nameRow">
              <h1 class="displayName">
                {{ displayName }}
                <span v-if="profile.isVerified" class="verifiedBadge">✔</span>
              </h1>

              <span class="onlinePill" :class="{ offline: !isOnlineNow }">
                <span class="onlineDot"></span>
                {{ isOnlineNow ? "Online" : "Offline" }}
              </span>
            </div>

            <div class="usernameRow">
              <span class="username">@{{ username }}</span>

              <span v-if="profile.location" class="locationPill">
                📍 {{ profile.location }}
              </span>

              <span v-if="profile.country" class="locationPill ghost">
                🌍 {{ profile.country }}
              </span>

              <span v-if="joinedText !== '—'" class="locationPill ghost">
                🗓 {{ joinedText }}
              </span>
            </div>

            <p class="bio">
              {{ profile.bio || (isOwnProfile ? "Tell people about yourself. Add a short bio ✨" : "No bio added yet.") }}
            </p>

            <div class="quickFacts">
              <div class="fact glassMini">
                <div class="factLabel">Email</div>
                <div class="factValue">{{ profile.email || "—" }}</div>
              </div>

              <div class="fact glassMini">
                <div class="factLabel">Location</div>
                <div class="factValue">{{ profile.location || "Add location" }}</div>
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
              <template v-if="isOwnProfile">
                <button class="btn primary" @click="openEdit = true">Edit Profile</button>
                <button class="btn ghost" @click="copyLink">Share</button>
                <button class="btn ghost" @click="goInbox">Inbox</button>
                <button class="btn ghost" @click="goLive">Go Live</button>
                <button class="btn ghost" @click="goHome">Home</button>
              </template>

              <template v-else>
                <button class="btn primary" @click="toggleFollow">
                  {{ isFollowing ? "Following" : "Follow" }}
                </button>
                <button class="btn ghost" @click="goInbox">Message</button>
                <button class="btn ghost" @click="startCall('audio')">Audio Call</button>
                <button class="btn ghost" @click="startCall('video')">Video Call</button>
                <button class="btn ghost" @click="copyLink">Share</button>
              </template>
            </div>

            <div class="connectDeck">
              <button class="connectCard glassMini" @click="goInbox">
                <div class="connectIcon">💬</div>
                <div class="connectMeta">
                  <div class="connectTitle">{{ isOwnProfile ? "Open Inbox" : "Message" }}</div>
                  <div class="connectSub">
                    {{ isOwnProfile ? "Jump back into chats fast." : "Start a direct conversation now." }}
                  </div>
                </div>
              </button>

              <button
                v-if="!isOwnProfile"
                class="connectCard glassMini"
                @click="startCall('audio')"
              >
                <div class="connectIcon">📞</div>
                <div class="connectMeta">
                  <div class="connectTitle">Audio Call</div>
                  <div class="connectSub">Quick voice connection from the profile.</div>
                </div>
              </button>

              <button
                class="connectCard glassMini"
                @click="isOwnProfile ? goLive() : copyLink()"
              >
                <div class="connectIcon">{{ isOwnProfile ? "🔴" : "🔗" }}</div>
                <div class="connectMeta">
                  <div class="connectTitle">{{ isOwnProfile ? "Start Live" : "Share Profile" }}</div>
                  <div class="connectSub">
                    {{ isOwnProfile ? "Go live directly from your profile hub." : "Send this profile to other people." }}
                  </div>
                </div>
              </button>

              <button
                v-if="!isOwnProfile"
                class="connectCard glassMini"
                @click="startCall('video')"
              >
                <div class="connectIcon">🎥</div>
                <div class="connectMeta">
                  <div class="connectTitle">Video Call</div>
                  <div class="connectSub">Launch a face-to-face call in one tap.</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="featureRail">
          <button class="featureChip" :class="{ active: tab === 'about' }" @click="tab = 'about'">About</button>
          <button class="featureChip" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
          <button class="featureChip" :class="{ active: tab === 'reels' }" @click="tab = 'reels'">Reels</button>
          <button class="featureChip" :class="{ active: tab === 'saved' }" @click="tab = 'saved'">Saved</button>
          <button
            v-if="isOwnProfile"
            class="featureChip"
            :class="{ active: tab === 'settings' }"
            @click="tab = 'settings'"
          >
            Settings
          </button>
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
                <div class="infoVal">{{ profile.email || "—" }}</div>
              </div>

              <div class="aboutCard glassMini">
                <div class="infoKey">Location</div>
                <div class="infoVal">{{ profile.location || "—" }}</div>
              </div>

              <div class="aboutCard glassMini">
                <div class="infoKey">Country</div>
                <div class="infoVal">{{ profile.country || "—" }}</div>
              </div>

              <div class="aboutCard glassMini">
                <div class="infoKey">Joined</div>
                <div class="infoVal">{{ joinedText }}</div>
              </div>

              <div class="aboutCard glassMini">
                <div class="infoKey">Website</div>
                <div class="infoVal">
                  <a
                    v-if="profile.website"
                    :href="normalizedWebsite"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="profileLink"
                  >
                    {{ profile.website }}
                  </a>
                  <span v-else>—</span>
                </div>
              </div>

              <div class="aboutCard glassMini">
                <div class="infoKey">Bio</div>
                <div class="infoVal multiline">{{ profile.bio || "No bio yet." }}</div>
              </div>
            </div>

            <div class="divider"></div>

            <h3 class="sectionSub">Highlights</h3>
            <div class="chips">
              <span class="chip">🔥 {{ creatorLevel }}</span>
              <span class="chip">🎬 {{ stats.reels }} Reels</span>
              <span class="chip">💬 Chat Ready</span>
              <span class="chip">📞 Live Calls</span>
              <span class="chip">⚡ Pulse / Pulse</span>
              <span v-if="profile.isVerified" class="chip">✔ Verified</span>
            </div>
          </template>

          <template v-else-if="tab === 'posts'">
            <div class="sectionHead">
              <h2 class="sectionTitle">Posts</h2>
              <span class="sectionMeta">{{ userPosts.length }} item{{ userPosts.length === 1 ? "" : "s" }}</span>
            </div>

            <div v-if="loading" class="state">Loading posts…</div>

            <div v-else-if="userPosts.length === 0" class="emptyBox">
              <div class="emptyIcon">📝</div>
              <div class="emptyTitle">No posts yet</div>
              <div class="emptySub">
                {{ isOwnProfile ? "Create your first post and your profile will light up." : "This user has not posted yet." }}
              </div>
              <button v-if="isOwnProfile" class="btn primary" @click="goHome">Create from Dashboard</button>
            </div>

            <div v-else class="postList">
              <article v-for="post in userPosts" :key="`post-${post.id}`" class="postCard glassMini">
                <div class="postHead">
                  <div>
                    <div class="postTitle">{{ firstLine(post.caption) || "Untitled post" }}</div>
                    <div class="postTime">{{ formatDate(post.created_at || post.createdAt) }}</div>
                  </div>
                  <span class="miniBadge ghost">
                    {{ post.video_url ? "Video" : post.image_url ? "Image" : "Text" }}
                  </span>
                </div>

                <div v-if="post.caption" class="postText clamp2">{{ post.caption }}</div>

                <img
                  v-if="post.image_url"
                  class="postMedia"
                  :src="mediaUrl(post.image_url)"
                  loading="lazy"
                />

                <video
                  v-else-if="post.video_url"
                  class="postMedia"
                  :src="mediaUrl(post.video_url)"
                  controls
                  playsinline
                  preload="metadata"
                ></video>
              </article>
            </div>
          </template>

          <template v-else-if="tab === 'reels'">
            <div class="sectionHead">
              <h2 class="sectionTitle">Reels</h2>
              <span class="sectionMeta">{{ userReels.length }} reel{{ userReels.length === 1 ? "" : "s" }}</span>
            </div>

            <div v-if="loading" class="state">Loading reels…</div>

            <div v-else-if="userReels.length === 0" class="emptyBox">
              <div class="emptyIcon">🎥</div>
              <div class="emptyTitle">No reels yet</div>
              <div class="emptySub">
                {{ isOwnProfile ? "Post short videos and they will show here." : "This user has no reels yet." }}
              </div>
              <button v-if="isOwnProfile" class="btn primary" @click="goHome">Open Dashboard</button>
            </div>

            <div v-else class="reelsGrid">
              <article v-for="reel in userReels" :key="`reel-${reel.id}`" class="reelCard glassMini">
                <video
                  class="reelVideo"
                  :src="mediaUrl(reel.video_url)"
                  controls
                  playsinline
                  preload="metadata"
                ></video>

                <div class="reelInfo">
                  <div class="postTitle clamp1">{{ firstLine(reel.caption) || "My reel" }}</div>
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
                <button class="btn ghost smallBtn" @click="toggleSound">
                  {{ soundOn ? "🔊 On" : "🔇 Off" }}
                </button>
              </div>

              <div class="infoRow">
                <span class="infoKey">Realtime profile sync</span>
                <span class="infoVal">{{ syncing ? "Working…" : "Ready ✅" }}</span>
              </div>

              <div class="infoRow">
                <span class="infoKey">Dark Mode</span>
                <span class="infoVal">Enabled ✅</span>
              </div>

              <div class="infoRow">
                <span class="infoKey">Private profile</span>
                <button class="btn ghost smallBtn" @click="togglePrivate">
                  {{ profile.isPrivate ? "🔒 Private" : "🌐 Public" }}
                </button>
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
              <strong>{{ userReels.length ? "Video creator" : "Text creator" }}</strong>
            </div>

            <div class="sideStat glassMini">
              <span>Visibility</span>
              <strong>{{ profile.isPrivate ? "Private" : "Public" }}</strong>
            </div>
          </div>

          <div class="divider"></div>

          <div class="panelTitle small">{{ isOwnProfile ? "Command Center" : "Connect" }}</div>
          <div class="signalCard glassMini">
            <div class="signalRow">
              <span class="signalLabel">Status</span>
              <strong>{{ isOnlineNow ? "Online now" : "Offline now" }}</strong>
            </div>
            <div class="signalRow">
              <span class="signalLabel">Best next move</span>
              <strong>{{ isOwnProfile ? "Post, message, or go live" : "Message or call from here" }}</strong>
            </div>
          </div>

          <div class="sideActions premiumActions">
            <template v-if="isOwnProfile">
              <button class="btn ghost fullBtn" @click="goHome">Create Post</button>
              <button class="btn ghost fullBtn" @click="goInbox">Open Inbox</button>
              <button class="btn ghost fullBtn" @click="goLive">Start Live</button>
              <button class="btn primary fullBtn" @click="openEdit = true">Update Profile</button>
            </template>

            <template v-else>
              <button class="btn primary fullBtn" @click="goInbox">Message User</button>
              <button class="btn ghost fullBtn" @click="startCall('video')">Video Call</button>
              <button class="btn ghost fullBtn" @click="startCall('audio')">Audio Call</button>
              <button class="btn ghost fullBtn" @click="toggleFollow">
                {{ isFollowing ? "Following" : "Follow User" }}
              </button>
            </template>
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

              <div class="field">
                <label>Country</label>
                <input v-model="edit.country" class="inputField" placeholder="USA" />
              </div>

              <div class="field">
                <label>Website</label>
                <input v-model="edit.website" class="inputField" placeholder="https://example.com" />
              </div>

              <div class="field">
                <label>Cover image URL</label>
                <input v-model="edit.coverUrl" class="inputField" placeholder="https://..." />
              </div>
            </div>

            <div class="modalActions">
              <button class="btn ghost" @click="openEdit = false">Cancel</button>
              <button class="btn primary" @click="saveProfile" :disabled="saving">
                {{ saving ? "Saving..." : "Save" }}
              </button>
            </div>

            <div class="hint">
              This version saves locally and syncs to your `/users/me` route.
            </div>
          </div>
        </div>
      </transition>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import Layout from "../components/Layout.vue"

const router = useRouter()
const route = useRoute()

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")
const token = localStorage.getItem("token") || ""

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")
  } catch {
    return null
  }
})()

const profile = reactive({
  id: "",
  displayName: "Pulse User",
  username: "user",
  email: "",
  avatarUrl: "",
  bio: "",
  location: "",
  country: "",
  website: "",
  coverUrl: "",
  createdAt: "",
  isPrivate: false,
  isVerified: false,
})

const stats = reactive({
  posts: 0,
  reels: 0,
  followers: 0,
  following: 0,
})

const tab = ref("about")
const openEdit = ref(false)
const soundOn = ref(localStorage.getItem("soundOn") !== "0")
const isOnlineNow = ref(navigator.onLine)
const loading = ref(false)
const syncing = ref(false)
const saving = ref(false)
const allPosts = ref([])
const isFollowing = ref(false)

const edit = reactive({
  displayName: "",
  username: "",
  bio: "",
  email: "",
  location: "",
  country: "",
  website: "",
  coverUrl: "",
})

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

const viewedUserId = computed(() => String(route.params.id || "").trim())
const myUserId = computed(() => String(me?.id || ""))
const isOwnProfile = computed(() => !viewedUserId.value || viewedUserId.value === myUserId.value)

const displayName = computed(() => profile.displayName || "Pulse User")
const username = computed(() => String(profile.username || "user").replace("@", ""))

const joinedText = computed(() => {
  if (!profile.createdAt) return "—"
  const d = new Date(profile.createdAt)
  if (Number.isNaN(d.getTime())) return String(profile.createdAt)
  return d.toLocaleDateString()
})

const userPosts = computed(() => {
  const targetId = String(profile.id || viewedUserId.value || "")
  return allPosts.value.filter(
    (p) => String(resolvePostUserId(p)) === targetId && !p.video_url
  )
})

const userReels = computed(() => {
  const targetId = String(profile.id || viewedUserId.value || "")
  return allPosts.value.filter(
    (p) => String(resolvePostUserId(p)) === targetId && !!p.video_url
  )
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
  if (powerScore.value >= 220) return "Elite Creator"
  if (powerScore.value >= 120) return "Rising Creator"
  return "New Creator"
})

const latestPostText = computed(() => {
  const first = [...allPosts.value]
    .filter((p) => String(resolvePostUserId(p)) === String(profile.id || ""))
    .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))[0]

  if (!first) return "No posts yet"
  return formatDate(first.created_at || first.createdAt)
})

const normalizedWebsite = computed(() => {
  if (!profile.website) return ""
  return /^https?:\/\//i.test(profile.website) ? profile.website : `https://${profile.website}`
})

const coverStyle = computed(() => {
  if (!profile.coverUrl) return {}
  return {
    backgroundImage: `linear-gradient(rgba(10,14,28,.28), rgba(10,14,28,.28)), url('${profile.coverUrl}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
})

function safeJSON(v) {
  try {
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

function loadLocalUser() {
  const user =
    safeJSON(localStorage.getItem("user")) ||
    safeJSON(localStorage.getItem("currentUser")) ||
    {}

  profile.id = user.id || user.userId || user.user_id || profile.id || ""
  profile.displayName =
    user.display_name ||
    user.displayName ||
    user.name ||
    user.full_name ||
    profile.displayName ||
    "Pulse User"

  profile.username =
    user.username ||
    user.handle ||
    user.email?.split("@")?.[0] ||
    profile.username ||
    "user"

  profile.email = user.email || profile.email || ""
  profile.avatarUrl = user.avatar_url || user.avatarUrl || user.profile_image || profile.avatarUrl || ""
  profile.bio = user.bio || user.about || profile.bio || ""
  profile.location = user.location || user.city || profile.location || ""
  profile.country = user.country || profile.country || ""
  profile.website = user.website || profile.website || ""
  profile.coverUrl = user.cover_url || user.coverUrl || profile.coverUrl || ""
  profile.createdAt = user.created_at || user.createdAt || user.joined_at || user.joinedAt || profile.createdAt || ""
  profile.isPrivate = !!(user.is_private ?? user.isPrivate ?? profile.isPrivate)
  profile.isVerified = !!(user.is_verified ?? user.isVerified ?? profile.isVerified)

  stats.posts = Number(user.postsCount ?? user.posts_count ?? stats.posts ?? 0)
  stats.reels = Number(user.reelsCount ?? user.reels_count ?? stats.reels ?? 0)
  stats.followers = Number(user.followers ?? user.followers_count ?? 0)
  stats.following = Number(user.following ?? user.following_count ?? 0)

  edit.displayName = profile.displayName
  edit.username = profile.username
  edit.bio = profile.bio
  edit.email = profile.email
  edit.location = profile.location
  edit.country = profile.country
  edit.website = profile.website
  edit.coverUrl = profile.coverUrl
}

function patchProfileFromUser(u = {}) {
  profile.id = u.id || u.userId || u.user_id || profile.id
  profile.displayName = u.display_name || u.displayName || u.name || u.full_name || profile.displayName
  profile.username = u.username || u.handle || u.email?.split("@")?.[0] || profile.username
  profile.email = u.email || profile.email
  profile.avatarUrl = u.avatar_url || u.avatarUrl || u.profile_image || u.image || profile.avatarUrl
  profile.bio = u.bio || u.about || profile.bio
  profile.location = u.location || u.city || profile.location
  profile.country = u.country || profile.country
  profile.website = u.website || profile.website
  profile.coverUrl = u.cover_url || u.coverUrl || profile.coverUrl
  profile.createdAt = u.created_at || u.createdAt || u.joined_at || u.joinedAt || profile.createdAt
  profile.isPrivate = !!(u.is_private ?? u.isPrivate ?? profile.isPrivate)
  profile.isVerified = !!(u.is_verified ?? u.isVerified ?? profile.isVerified)

  stats.followers = Number(u.followers ?? u.followers_count ?? stats.followers ?? 0)
  stats.following = Number(u.following ?? u.following_count ?? stats.following ?? 0)

  edit.displayName = profile.displayName
  edit.username = profile.username
  edit.bio = profile.bio
  edit.email = profile.email
  edit.location = profile.location
  edit.country = profile.country
  edit.website = profile.website
  edit.coverUrl = profile.coverUrl
}

function saveUserPatch(patch) {
  const existing = safeJSON(localStorage.getItem("user")) || safeJSON(localStorage.getItem("currentUser")) || {}
  const merged = { ...existing, ...patch }
  localStorage.setItem("user", JSON.stringify(merged))
  localStorage.setItem("currentUser", JSON.stringify(merged))
}

async function fetchOwnProfileRemote() {
  if (!token) return

  syncing.value = true
  try {
    const res = await fetch(`${apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("failed")
    const data = await res.json()
    patchProfileFromUser(data)
    saveUserPatch(data)
  } catch (err) {
    console.error("fetchOwnProfileRemote failed:", err)
  } finally {
    syncing.value = false
  }
}

async function fetchViewedUser() {
  if (!token || !viewedUserId.value) return

  syncing.value = true
  try {
    const res = await fetch(`${apiBase}/users/${viewedUserId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("failed")
    const data = await res.json()
    patchProfileFromUser(data)
  } catch (err) {
    console.error("fetchViewedUser failed:", err)
  } finally {
    syncing.value = false
  }
}

async function fetchPostsRemote() {
  try {
    const res = await fetch(`${apiBase}/posts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error("posts fetch failed")
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.posts || []
    allPosts.value = list
    stats.posts = userPosts.value.length
    stats.reels = userReels.value.length
  } catch {
    const cached = safeJSON(localStorage.getItem("posts")) || []
    allPosts.value = Array.isArray(cached) ? cached : []
    stats.posts = userPosts.value.length
    stats.reels = userReels.value.length
  }
}

async function saveProfile() {
  if (!isOwnProfile.value || !token) return

  saving.value = true
  syncing.value = true

  try {
    const payload = {
      display_name: edit.displayName.trim() || profile.displayName,
      username: String(edit.username || profile.username).replace("@", "").trim(),
      bio: edit.bio?.trim() || "",
      location: edit.location?.trim() || "",
      country: edit.country?.trim() || "",
      website: edit.website?.trim() || "",
      cover_url: edit.coverUrl?.trim() || "",
      avatar_url: profile.avatarUrl || "",
      is_private: !!profile.isPrivate,
    }

    profile.displayName = payload.display_name
    profile.username = payload.username
    profile.bio = payload.bio
    profile.location = payload.location
    profile.country = payload.country
    profile.website = payload.website
    profile.coverUrl = payload.cover_url

    saveUserPatch({
      ...payload,
      id: profile.id,
      email: profile.email,
      created_at: profile.createdAt,
      is_verified: profile.isVerified,
    })

    const res = await fetch(`${apiBase}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error("Failed to update profile")

    const data = await res.json()
    patchProfileFromUser(data)
    saveUserPatch(data)

    openEdit.value = false
  } catch (err) {
    console.error("saveProfile failed:", err)
  } finally {
    saving.value = false
    syncing.value = false
  }
}

async function onPickAvatar(ev) {
  const file = ev.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = String(reader.result || "")
    profile.avatarUrl = base64
    saveUserPatch({ avatar_url: base64, avatarUrl: base64 })

    if (!token || !isOwnProfile.value) return

    try {
      syncing.value = true
      const res = await fetch(`${apiBase}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar_url: base64,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        patchProfileFromUser(data)
        saveUserPatch(data)
      }
    } catch (err) {
      console.error("avatar update failed:", err)
    } finally {
      syncing.value = false
    }
  }
  reader.readAsDataURL(file)
}

function resolvePostUserId(post) {
  return (
    post.user_id ??
    post.userId ??
    post.author_id ??
    post.authorId ??
    post.created_by ??
    post.user?.id ??
    post.author?.id ??
    ""
  )
}

function mediaUrl(path) {
  if (!path) return ""
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) return path
  return `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`
}

function firstLine(text) {
  return String(text || "").split("\n")[0].trim()
}

function formatDate(value) {
  if (!value) return "Recently"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toggleSound() {
  soundOn.value = !soundOn.value
  localStorage.setItem("soundOn", soundOn.value ? "1" : "0")
}

async function togglePrivate() {
  profile.isPrivate = !profile.isPrivate
  if (isOwnProfile.value) {
    await saveProfile()
  }
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value
  stats.followers = Math.max(0, stats.followers + (isFollowing.value ? 1 : -1))
}

function onAvatarError(e) {
  e.target.src = defaultAvatar
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
  const query = {}

  if (!isOwnProfile.value && profile.id) {
    query.userId = String(profile.id)
    query.name = displayName.value
  }

  router.push({ path: "/messages", query })
}

function goLive() {
  router.push("/live")
}

function startCall(callKind = "video") {
  if (!profile.id) return
  router.push({
    path: "/call",
    query: {
      toUserId: String(profile.id),
      kind: callKind,
      mode: "caller",
      name: displayName.value,
    },
  })
}

async function refreshAll() {
  loading.value = true

  if (isOwnProfile.value) {
    loadLocalUser()
    await fetchOwnProfileRemote()
  } else {
    await fetchViewedUser()
  }

  await fetchPostsRemote()

  loading.value = false
}

function onOnline() {
  isOnlineNow.value = true
}

function onOffline() {
  isOnlineNow.value = false
}

watch(
  () => route.params.id,
  async () => {
    await refreshAll()
  }
)

onMounted(async () => {
  window.addEventListener("online", onOnline)
  window.addEventListener("offline", onOffline)
  loadLocalUser()
  await refreshAll()
})

onBeforeUnmount(() => {
  window.removeEventListener("online", onOnline)
  window.removeEventListener("offline", onOffline)
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
.verifiedBadge {
  display: inline-block;
  margin-left: 8px;
  font-size: 20px;
  vertical-align: middle;
  color: #7fd0ff;
}
.usernameRow {
  margin-top: 10px;
}
.connectDeck {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.connectCard {
  width: 100%;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, background .18s ease;
}
.connectCard:hover {
  transform: translateY(-2px);
  border-color: rgba(127, 208, 255, 0.28);
  background: rgba(255,255,255,.08);
}
.connectIcon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 24px;
  flex: 0 0 52px;
  background: linear-gradient(135deg, rgba(255,42,109,.24), rgba(91,140,255,.24));
  border: 1px solid rgba(255,255,255,.12);
}
.connectMeta {
  min-width: 0;
}
.connectTitle {
  font-size: 15px;
  font-weight: 900;
}
.connectSub {
  margin-top: 4px;
  opacity: .72;
  font-size: 13px;
  line-height: 1.35;
}
.signalCard {
  padding: 14px;
  margin-bottom: 14px;
}
.signalRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.signalRow + .signalRow {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.signalLabel {
  opacity: .74;
}
.premiumActions {
  margin-top: 0;
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
.profileLink {
  color: #a9d6ff;
  text-decoration: none;
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
.clamp1 { 
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.clamp2 { 
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
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