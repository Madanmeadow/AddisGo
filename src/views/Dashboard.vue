<template>
  <div class="dashboard">

    <!-- HEADER -->
    <header class="header">
      <h1>🔥 AddisGo</h1>

      <div class="user-section">
        <span>Welcome, {{ user?.name }}</span>
        <button @click="logout">Logout</button>
      </div>
    </header>

    <!-- POST CREATOR -->
    <div class="post-creator">

      <textarea
        v-model="newCaption"
        placeholder="What's happening?"
      ></textarea>

      <input type="file" @change="handleFile" />

      <button @click="createPost">
        Post 🚀
      </button>

    </div>

    <!-- FEED -->
    <div class="feed">

      <div
        v-for="post in posts"
        :key="post.id"
        class="post-card"
      >
        <div class="post-header">
          <strong>{{ post.user_name || "User" }}</strong>
          <small>{{ formatDate(post.created_at) }}</small>
        </div>

        <p class="caption">{{ post.caption }}</p>

        <video
          v-if="post.video_url"
          :src="post.video_url"
          controls
        ></video>

        <div class="actions">
          <button @click="likePost(post.id)">
            ❤️ {{ post.likes || 0 }}
          </button>
          <button>
            💬 Comment
          </button>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const user = ref(JSON.parse(localStorage.getItem("user")))
const token = localStorage.getItem("token")

const posts = ref([])
const newCaption = ref("")
const selectedFile = ref(null)

function logout() {
  localStorage.clear()
  router.push("/login")
}

function handleFile(e) {
  selectedFile.value = e.target.files[0]
}

async function fetchPosts() {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/posts`
  )
  posts.value = await res.json()
}

async function createPost() {
  const formData = new FormData()
  formData.append("caption", newCaption.value)

  if (selectedFile.value) {
    formData.append("video", selectedFile.value)
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/posts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  )

  if (res.ok) {
    newCaption.value = ""
    selectedFile.value = null
    fetchPosts()
  }
}

async function likePost(id) {
  await fetch(
    `${import.meta.env.VITE_API_URL}/api/posts/${id}/like`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  fetchPosts()
}

function formatDate(date) {
  return new Date(date).toLocaleString()
}

onMounted(fetchPosts)
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 20px;
  color: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header button {
  background: crimson;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.post-creator {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 30px;
  backdrop-filter: blur(15px);
}

.post-creator textarea {
  width: 100%;
  min-height: 80px;
  border: none;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.post-creator button {
  background: linear-gradient(90deg,#ff416c,#ff4b2b);
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: rgba(255,255,255,0.07);
  padding: 20px;
  border-radius: 18px;
  backdrop-filter: blur(12px);
}

.post-card video {
  width: 100%;
  border-radius: 12px;
  margin-top: 10px;
}

.actions {
  margin-top: 10px;
  display: flex;
  gap: 15px;
}

.actions button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}
</style>

