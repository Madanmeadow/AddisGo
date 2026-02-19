<template>
  <div class="dashboard">

    <!-- HEADER -->
    <header class="topbar">
      <div class="logo">
        🔥 <span>AddisGo</span>
      </div>

      <div class="user-area">
        <span>Welcome, {{ user?.name }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
    </header>

    <!-- CREATE POST -->
    <section class="create-post">
      <textarea
        v-model="caption"
        placeholder="What's happening?"
        rows="4"
      ></textarea>

      <div class="actions">
        <input type="file" @change="handleFile" />
        <button @click="createPost" :disabled="loading">
          {{ loading ? "Posting..." : "Post 🚀" }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <!-- POSTS FEED -->
    <section class="feed">
      <div v-for="post in posts" :key="post.id" class="post-card">

        <div class="post-header">
          <div class="avatar">{{ post.user_name?.[0] || "U" }}</div>
          <div>
            <h4>{{ post.user_name || "User" }}</h4>
            <small>{{ formatDate(post.created_at) }}</small>
          </div>
        </div>

        <p class="caption" v-if="post.caption">{{ post.caption }}</p>

        <!-- IMAGE -->
        <img
          v-if="post.image_url"
          :src="backendURL + post.image_url"
          class="media"
        />

        <!-- VIDEO -->
        <video
          v-if="post.video_url"
          controls
          class="media"
        >
          <source :src="backendURL + post.video_url" />
        </video>

        <!-- FOOTER -->
        <div class="post-actions">
          <button @click="likePost(post.id)">❤️ {{ post.likes || 0 }}</button>
          <button>💬 Comment</button>
        </div>

      </div>
    </section>

  </div>
</template>

<script>
const API = import.meta.env.VITE_API_URL

export default {
  name: "Dashboard",
  data() {
    return {
      user: JSON.parse(localStorage.getItem("user")),
      token: localStorage.getItem("token"),
      caption: "",
      file: null,
      posts: [],
      loading: false,
      error: null,
      backendURL: API
    }
  },

  mounted() {
    this.fetchPosts()
  },

  methods: {

    logout() {
      localStorage.clear()
      this.$router.push("/login")
    },

    handleFile(event) {
      this.file = event.target.files[0]
    },

    async createPost() {
      try {
        this.loading = true
        this.error = null

        const formData = new FormData()
        formData.append("caption", this.caption)
        if (this.file) formData.append("file", this.file)

        const res = await fetch(`${API}/api/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`
          },
          body: formData
        })

        if (!res.ok) throw new Error("Failed to post")

        this.caption = ""
        this.file = null
        this.fetchPosts()

      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchPosts() {
      try {
        const res = await fetch(`${API}/api/posts`)
        const data = await res.json()
        this.posts = data.reverse()
      } catch (err) {
        console.error(err)
      }
    },

    likePost(id) {
      const post = this.posts.find(p => p.id === id)
      if (post) post.likes = (post.likes || 0) + 1
    },

    formatDate(date) {
      return new Date(date).toLocaleString()
    }

  }
}
</script>

<style scoped>

.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e3f, #2e2e5e);
  color: white;
  padding-bottom: 50px;
}

/* HEADER */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 40px;
  background: linear-gradient(90deg, #0f0f2e, #1b1b4d);
  box-shadow: 0 5px 20px rgba(0,0,0,0.4);
}

.logo {
  font-size: 26px;
  font-weight: bold;
}

.user-area {
  display: flex;
  gap: 20px;
  align-items: center;
}

.logout-btn {
  background: #ff3c5f;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

/* CREATE POST */
.create-post {
  width: 60%;
  margin: 40px auto;
  background: #2c2c5c;
  padding: 25px;
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
}

.create-post textarea {
  width: 100%;
  border-radius: 12px;
  padding: 15px;
  border: none;
  resize: none;
  font-size: 16px;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.actions button {
  background: linear-gradient(45deg, #ff3c5f, #ff8c42);
  border: none;
  padding: 12px 25px;
  border-radius: 12px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

/* FEED */
.feed {
  width: 60%;
  margin: auto;
}

.post-card {
  background: #34346e;
  padding: 20px;
  border-radius: 18px;
  margin-bottom: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  transition: 0.3s;
}

.post-card:hover {
  transform: translateY(-5px);
}

.post-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff3c5f, #ff8c42);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.caption {
  margin-bottom: 15px;
}

.media {
  width: 100%;
  border-radius: 15px;
  margin-bottom: 15px;
}

.post-actions {
  display: flex;
  gap: 20px;
}

.post-actions button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}

.error {
  color: #ff4d6d;
  margin-top: 10px;
}

@media (max-width: 900px) {
  .create-post,
  .feed {
    width: 90%;
  }
}

</style>


