<script setup>
import { ref, onMounted } from "vue"

const API = import.meta.env.VITE_API_URL

const caption = ref("")
const file = ref(null)
const posts = ref([])
const loading = ref(false)
const error = ref(null)

const token = localStorage.getItem("token")

const fetchPosts = async () => {
  const res = await fetch(`${API}/api/posts`)
  posts.value = await res.json()
}

const handleFile = (e) => {
  file.value = e.target.files[0]
}

const createPost = async () => {
  try {
    error.value = null
    loading.value = true

    const formData = new FormData()
    formData.append("caption", caption.value)

    if (file.value) {
      formData.append("media", file.value)
    }

    const res = await fetch(`${API}/api/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!res.ok) throw new Error()

    const data = await res.json()
    posts.value.unshift(data.post)

    caption.value = ""
    file.value = null

  } catch (err) {
    error.value = "Failed to post"
  } finally {
    loading.value = false
  }
}

onMounted(fetchPosts)
</script>

<template>
<div class="dashboard">

  <div class="create-card">
    <textarea v-model="caption" placeholder="What's happening?"></textarea>

    <div class="actions">
      <input type="file" @change="handleFile" />
      <button @click="createPost" :disabled="loading">
        {{ loading ? "Posting..." : "Post 🚀" }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>

  <div v-for="post in posts" :key="post.id" class="post-card">
    <h3>{{ post.name }}</h3>
    <p>{{ post.caption }}</p>

    <img v-if="post.image_url"
         :src="API + post.image_url"
         class="media" />

    <video v-if="post.video_url"
           controls
           class="media">
      <source :src="API + post.video_url" />
    </video>

    <small>{{ new Date(post.created_at).toLocaleString() }}</small>
  </div>

</div>
</template>

<style scoped>
.dashboard {
  max-width: 700px;
  margin: auto;
  padding: 20px;
}

.create-card {
  background: linear-gradient(135deg, #3a3a8a, #1f1f50);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 30px;
  color: white;
}

textarea {
  width: 100%;
  height: 100px;
  border-radius: 15px;
  padding: 15px;
  border: none;
  font-size: 16px;
  margin-bottom: 15px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

button {
  background: linear-gradient(45deg, #ff4b2b, #ff416c);
  border: none;
  padding: 10px 20px;
  border-radius: 30px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.post-card {
  background: #2d2d5f;
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
  color: white;
}

.media {
  width: 100%;
  margin-top: 15px;
  border-radius: 15px;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>


