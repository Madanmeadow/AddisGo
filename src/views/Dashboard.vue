<template>
  <div class="dashboard">

    <!-- HEADER -->
    <header class="header">
      <div class="logo">
        🔥 <span>AddisGo</span>
      </div>

      <div class="user-section">
        <span>Welcome, {{ user.name }}</span>
        <button class="logout-btn" @click="logout">Logout</button>
      </div>
    </header>

    <!-- CREATE POST -->
    <div class="create-post">

      <textarea
        v-model="caption"
        placeholder="What's happening?"
        rows="4"
      ></textarea>

      <!-- FILE PREVIEW -->
      <div v-if="preview" class="preview">
        <img v-if="isImage" :src="preview" />
        <video v-if="isVideo" :src="preview" controls />
      </div>

      <div class="actions">
        <input type="file" @change="handleFile" />
        <button @click="createPost" :disabled="loading">
          {{ loading ? "Posting..." : "Post 🚀" }}
        </button>
      </div>
    </div>

    <!-- POSTS FEED -->
    <div class="feed">
      <div v-for="post in posts" :key="post.id" class="post-card">

        <div class="post-header">
          <strong>User {{ post.user_id }}</strong>
          <span>{{ formatDate(post.created_at) }}</span>
        </div>

        <p v-if="post.caption" class="caption">
          {{ post.caption }}
        </p>

        <img
          v-if="post.image_url"
          :src="post.image_url"
          class="post-media"
        />

        <video
          v-if="post.video_url"
          :src="post.video_url"
          class="post-media"
          controls
        />

        <div class="post-actions">
          <button @click="likePost(post)">
            ❤️ {{ post.likes || 0 }}
          </button>
          <button>💬 Comment</button>
        </div>

      </div>
    </div>

  </div>
</template>

<script>
import axios from "axios"

export default {
  data() {
    return {
      user: JSON.parse(localStorage.getItem("user")),
      caption: "",
      file: null,
      preview: null,
      isImage: false,
      isVideo: false,
      posts: [],
      loading: false
    }
  },

  async mounted() {
    await this.fetchPosts()
  },

  methods: {

    async fetchPosts() {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/posts`
        )
        this.posts = res.data
      } catch (err) {
        console.error("Fetch posts error:", err)
      }
    },

    handleFile(event) {
      const selected = event.target.files[0]
      if (!selected) return

      this.file = selected
      this.preview = URL.createObjectURL(selected)

      this.isImage = selected.type.startsWith("image")
      this.isVideo = selected.type.startsWith("video")
    },

    async createPost() {
      try {
        this.loading = true

        let image_url = null
        let video_url = null

        if (this.file) {
          const formData = new FormData()
          formData.append("file", this.file)

          const uploadRes = await axios.post(
            `${import.meta.env.VITE_API_URL}/upload`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data"
              }
            }
          )

          const uploadedUrl = uploadRes.data.url

          if (this.isImage) image_url = uploadedUrl
          if (this.isVideo) video_url = uploadedUrl
        }

        await axios.post(
          `${import.meta.env.VITE_API_URL}/posts`,
          {
            user_id: this.user.id,
            caption: this.caption,
            image_url,
            video_url
          }
        )

        this.caption = ""
        this.file = null
        this.preview = null

        await this.fetchPosts()

      } catch (err) {
        console.error("Create post error:", err)
        alert("Post failed.")
      } finally {
        this.loading = false
      }
    },

    likePost(post) {
      post.likes = (post.likes || 0) + 1
    },

    formatDate(date) {
      return new Date(date).toLocaleString()
    },

    logout() {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      this.$router.push("/login")
    }

  }
}
</script>

<style scoped>

.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e3f, #2a2a60);
  padding-bottom: 50px;
  color: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 40px;
  background: linear-gradient(135deg, #111133, #222266);
}

.logo span {
  font-size: 26px;
  font-weight: bold;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  background: #ff3366;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

.create-post {
  background: rgba(255,255,255,0.05);
  margin: 30px auto;
  padding: 25px;
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  backdrop-filter: blur(10px);
}

textarea {
  width: 100%;
  border-radius: 15px;
  padding: 15px;
  border: none;
  resize: none;
  font-size: 16px;
}

.preview {
  margin-top: 15px;
}

.preview img,
.preview video {
  width: 100%;
  border-radius: 15px;
  margin-top: 10px;
}

.actions {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions button {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.feed {
  width: 90%;
  max-width: 600px;
  margin: auto;
}

.post-card {
  background: rgba(255,255,255,0.07);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 25px;
  backdrop-filter: blur(10px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.caption {
  margin-bottom: 10px;
}

.post-media {
  width: 100%;
  border-radius: 15px;
  margin-top: 10px;
}

.post-actions {
  display: flex;
  gap: 20px;
  margin-top: 10px;
}

.post-actions button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

@media (max-width: 600px) {
  .header {
    padding: 20px;
  }

  .create-post,
  .feed {
    width: 95%;
  }
}

</style>


