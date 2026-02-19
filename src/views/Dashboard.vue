<template>
  <div class="dashboard">

    <!-- ================= HEADER ================= -->
    <header class="header">
      <div class="logo">🔥 AddisGo</div>

      <div class="user-area">
        <span>Welcome, {{ user?.name }}</span>
        <button class="logout-btn" @click="logout">Logout</button>
      </div>
    </header>

    <!-- ================= CREATE POST ================= -->
    <div class="create-post">
      <textarea
        v-model="caption"
        placeholder="What's happening?"
      ></textarea>

      <div class="upload-row">
        <input type="file" @change="handleFile" />
        <button class="post-btn" @click="createPost">
          Post 🚀
        </button>
      </div>
    </div>

    <!-- ================= POSTS FEED ================= -->
    <div class="feed">

      <div
        v-for="post in posts"
        :key="post.id"
        class="post-card"
      >

        <!-- Post Header -->
        <div class="post-header">
          <div class="avatar"></div>
          <div>
            <h4>User {{ post.user_id }}</h4>
            <small>{{ formatTime(post.created_at) }}</small>
          </div>
        </div>

        <!-- Caption -->
        <p v-if="post.caption" class="caption">
          {{ post.caption }}
        </p>

        <!-- Image -->
        <img
          v-if="post.image_url"
          :src="post.image_url"
          class="media"
        />

        <!-- Video -->
        <video
          v-if="post.video_url"
          controls
          class="media"
        >
          <source :src="post.video_url" />
        </video>

        <!-- Actions -->
        <div class="actions">
          <button @click="likePost(post)">❤️ {{ post.likes || 0 }}</button>
          <button>💬 Comment</button>
        </div>

      </div>

    </div>

  </div>
</template>

<script>
import axios from "axios"

export default {
  name: "Dashboard",

  data() {
    return {
      caption: "",
      file: null,
      posts: [],
      user: JSON.parse(localStorage.getItem("user"))
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
        console.error(err)
      }
    },

    handleFile(e) {
      this.file = e.target.files[0]
    },

    async createPost() {
      try {
        let image_url = null
        let video_url = null

        // If file exists → upload first
        if (this.file) {
          const formData = new FormData()
          formData.append("file", this.file)

          const uploadRes = await axios.post(
            `${import.meta.env.VITE_API_URL}/upload`,
            formData
          )

          if (this.file.type.startsWith("image")) {
            image_url = uploadRes.data.url
          } else {
            video_url = uploadRes.data.url
          }
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

        await this.fetchPosts()

      } catch (err) {
        console.error(err)
      }
    },

    likePost(post) {
      post.likes = (post.likes || 0) + 1
    },

    formatTime(date) {
      return new Date(date).toLocaleString()
    },

    logout() {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
  }
}
</script>

<style scoped>

.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e3f, #2d2d60);
  color: white;
  padding-bottom: 50px;
}

/* ================= HEADER ================= */

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 40px;
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(15px);
}

.logo {
  font-size: 32px;
  font-weight: bold;
}

.user-area {
  display: flex;
  gap: 20px;
  align-items: center;
}

.logout-btn {
  background: #ff2f56;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  color: white;
  cursor: pointer;
}

/* ================= CREATE POST ================= */

.create-post {
  max-width: 700px;
  margin: 40px auto;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(15px);
  padding: 25px;
  border-radius: 20px;
}

.create-post textarea {
  width: 100%;
  height: 120px;
  border-radius: 15px;
  border: none;
  padding: 15px;
  font-size: 16px;
}

.upload-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.post-btn {
  background: linear-gradient(45deg, #ff6b6b, #ff2f56);
  border: none;
  padding: 12px 25px;
  border-radius: 12px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.post-btn:hover {
  transform: scale(1.05);
}

/* ================= FEED ================= */

.feed {
  max-width: 700px;
  margin: auto;
}

.post-card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(15px);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 25px;
  transition: 0.3s;
}

.post-card:hover {
  transform: translateY(-5px);
}

/* ================= POST HEADER ================= */

.post-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b6b, #f94d6a);
}

.caption {
  margin: 15px 0;
  font-size: 16px;
}

.media {
  width: 100%;
  border-radius: 15px;
  margin-top: 10px;
}

/* ================= ACTIONS ================= */

.actions {
  display: flex;
  gap: 25px;
  margin-top: 15px;
}

.actions button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

.actions button:hover {
  color: #ff6b6b;
}

</style>

