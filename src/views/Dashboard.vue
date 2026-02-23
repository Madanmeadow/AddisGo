<template>
  <Layout>
    <div class="dashboard">

      <!-- LEFT SIDEBAR -->
      <div class="left-panel">
        <h1 class="logo">🔥 AddisGo</h1>

        <div class="live-box">
          <h3>🔴 Live Now</h3>
          <button class="live-btn" @click="startLive">Go Live</button>

          <div v-if="liveStreams.length === 0" class="empty-live">
            No one live right now
          </div>

          <div
            v-for="stream in liveStreams"
            :key="stream"
            class="live-card"
            @click="joinLive(stream)"
          >
            🔴 {{ stream }}
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="main-panel">

        <!-- CREATE POST -->
        <div class="create-post">
          <textarea
            v-model="content"
            placeholder="What's happening?"
          ></textarea>

          <div class="actions">
            <input type="file" @change="handleFile" />
            <button @click="submitPost" :disabled="posting">
              {{ posting ? "Posting..." : "Post 🚀" }}
            </button>
          </div>
        </div>

        <!-- POSTS -->
        <div v-if="loading" class="status">Loading posts...</div>

        <div v-else-if="posts.length === 0" class="status">
          No posts yet.
        </div>

        <div v-else>
          <div
            v-for="post in posts"
            :key="post._id"
            class="post-card"
          >
            <div class="post-header">
              <div class="avatar">
                {{ post.user?.username?.charAt(0).toUpperCase() }}
              </div>

              <div>
                <strong>{{ post.user?.username }}</strong>
                <div class="date">
                  {{ formatDate(post.createdAt) }}
                </div>
              </div>
            </div>

            <div v-if="post.content" class="post-content">
              {{ post.content }}
            </div>

            <img
              v-if="post.image"
              :src="getMedia(post.image)"
              class="media"
            />

            <video
              v-if="post.video"
              controls
              :src="getMedia(post.video)"
              class="media"
            ></video>
          </div>
        </div>

      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue"
import Layout from "../components/Layout.vue"
import { io } from "socket.io-client"

const apiUrl = import.meta.env.VITE_API_URL
const token = localStorage.getItem("token")
const user = JSON.parse(localStorage.getItem("user"))

const socket = io(apiUrl)

const posts = ref([])
const content = ref("")
const file = ref(null)
const loading = ref(true)
const posting = ref(false)
const liveStreams = ref([])

/* ================= POSTS ================= */

async function fetchPosts() {
  try {
    loading.value = true

    const res = await fetch(`${apiUrl}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) throw new Error("Failed to fetch posts")

    const data = await res.json()

    console.log("Fetched posts:", data)

    posts.value = data.reverse()

  } catch (err) {
    console.error("Fetch posts error:", err)
  } finally {
    loading.value = false
  }
}

async function submitPost() {
  if (!content.value.trim() && !file.value) return

  try {
    posting.value = true

    const form = new FormData()
    form.append("content", content.value)
    if (file.value) form.append("file", file.value)

    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })

    if (!res.ok) throw new Error("Post failed")

    const newPost = await res.json()

    // Instant UI update
    posts.value.unshift(newPost)

    content.value = ""
    file.value = null

  } catch (err) {
    console.error("Submit post error:", err)
  } finally {
    posting.value = false
  }
}

function handleFile(e) {
  file.value = e.target.files[0]
}

/* ================= MEDIA ================= */

function getMedia(url) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${apiUrl}${url}`
}

function formatDate(date) {
  if (!date) return ""
  return new Date(date).toLocaleString()
}

/* ================= LIVE ================= */

function startLive() {
  socket.emit("start-live", { userId: user.id })
}

function joinLive(streamId) {
  socket.emit("join-live", streamId)
  alert("Joined " + streamId)
}

socket.on("live-list", (streams) => {
  liveStreams.value = streams
})

socket.on("newPost", (post) => {
  posts.value.unshift(post)
})

/* ================= INIT ================= */

onMounted(() => {
  fetchPosts()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  gap: 30px;
  max-width: 1300px;
  margin: auto;
  padding: 30px;
}

.left-panel {
  width: 280px;
}

.logo {
  font-size: 28px;
  margin-bottom: 30px;
}

.live-box {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 20px;
}

.live-btn {
  width: 100%;
  margin-bottom: 15px;
}

.live-card {
  background: rgba(255,0,0,0.2);
  padding: 12px;
  border-radius: 15px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: 0.3s;
}

.live-card:hover {
  background: rgba(255,0,0,0.35);
}

.main-panel {
  flex: 1;
}

.create-post {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 30px;
}

textarea {
  width: 100%;
  padding: 15px;
  border-radius: 15px;
  resize: none;
  margin-bottom: 10px;
  font-size: 15px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

button {
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 15px;
  cursor: pointer;
}

.post-card {
  background: rgba(0,0,0,0.6);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 25px;
}

.post-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 10px;
}

.avatar {
  width: 45px;
  height: 45px;
  background: #ff416c;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
}

.media {
  width: 100%;
  border-radius: 20px;
  margin-top: 15px;
}

.status {
  text-align: center;
  margin-top: 50px;
  font-size: 18px;
}
</style>