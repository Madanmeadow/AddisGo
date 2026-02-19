<template>
  <div class="dashboard">

    <!-- TOP NAV -->
    <header class="topbar">
      <div class="logo">🔥 AddisGo</div>

      <div class="nav-center">
        <input type="text" placeholder="Search AddisGo..." />
      </div>

      <div class="nav-right">
        <div class="profile">
          <div class="avatar">
            {{ userInitial }}
          </div>
          <span class="username">{{ user?.name }}</span>
        </div>

        <button class="logout-btn" @click="logout">
          Logout
        </button>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <div class="layout">

      <!-- LEFT SIDEBAR -->
      <aside class="sidebar">
        <ul>
          <li>🏠 Home</li>
          <li>🔥 Trending</li>
          <li>👥 Friends</li>
          <li>🎥 Videos</li>
          <li>⚙ Settings</li>
        </ul>
      </aside>

      <!-- FEED -->
      <main class="feed">

        <!-- CREATE POST -->
        <div class="composer">
          <textarea
            v-model="caption"
            placeholder="What’s happening?"
          ></textarea>

          <div class="composer-actions">
            <input type="file" @change="handleFile" />

            <button
              class="post-btn"
              :disabled="loading"
              @click="createPost"
            >
              {{ loading ? "Posting..." : "Post 🚀" }}
            </button>
          </div>
        </div>

        <!-- POSTS -->
        <div
          class="post-card"
          v-for="post in posts"
          :key="post.id"
        >
          <div class="post-header">
            <div class="avatar small">
              {{ post.name?.charAt(0) || 'U' }}
            </div>
            <div>
              <h4>{{ post.name || "User" }}</h4>
              <small>{{ formatDate(post.created_at) }}</small>
            </div>
          </div>

          <p class="caption">{{ post.caption }}</p>

          <img
            v-if="post.image_url"
            :src="apiUrl + post.image_url"
            class="media"
          />

          <video
            v-if="post.video_url"
            :src="apiUrl + post.video_url"
            controls
            class="media"
          ></video>

          <div class="post-actions">
            <button @click="likePost(post)">
              ❤️ {{ post.likes || 0 }}
            </button>
            <button>
              💬 Comment
            </button>
            <button>
              🔁 Share
            </button>
          </div>
        </div>

      </main>

      <!-- RIGHT SIDE -->
      <aside class="rightbar">
        <div class="widget">
          <h3>🔥 Trending Now</h3>
          <p>#AddisGo</p>
          <p>#FuturePlatform</p>
          <p>#BuiltWithVue</p>
        </div>
      </aside>

    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      caption: "",
      file: null,
      posts: [],
      loading: false,
      apiUrl: import.meta.env.VITE_API_URL,
      user: JSON.parse(localStorage.getItem("user"))
    }
  },

  computed: {
    userInitial() {
      return this.user?.name?.charAt(0) || "U"
    }
  },

  mounted() {
    this.fetchPosts()
  },

  methods: {
    async fetchPosts() {
      const res = await fetch(`${this.apiUrl}/api/posts`)
      this.posts = await res.json()
    },

    handleFile(e) {
      this.file = e.target.files[0]
    },

    async createPost() {
      try {
        this.loading = true

        const formData = new FormData()
        formData.append("caption", this.caption)
        if (this.file) formData.append("media", this.file)

        const res = await fetch(`${this.apiUrl}/api/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: formData
        })

        if (!res.ok) throw new Error()

        this.caption = ""
        this.file = null
        await this.fetchPosts()

      } catch {
        alert("Failed to post")
      } finally {
        this.loading = false
      }
    },

    likePost(post) {
      post.likes = (post.likes || 0) + 1
    },

    logout() {
      localStorage.clear()
      this.$router.push("/login")
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
  background: linear-gradient(135deg,#1e1e4f,#2e2e6f);
  color: white;
}

/* TOP BAR */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
}

.logo {
  font-size: 28px;
  font-weight: bold;
}

.nav-center input {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  width: 250px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg,#ff4b2b,#ff416c);
  border-radius: 50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
}

.small {
  width: 35px;
  height: 35px;
}

.logout-btn {
  background:#ff416c;
  border:none;
  padding:8px 14px;
  border-radius:8px;
  color:white;
  cursor:pointer;
}

/* LAYOUT */
.layout {
  display: grid;
  grid-template-columns: 220px 1fr 250px;
  gap: 20px;
  padding: 30px;
}

.sidebar, .rightbar {
  background: rgba(255,255,255,0.05);
  padding:20px;
  border-radius:16px;
}

.feed {
  max-width: 700px;
  margin: auto;
}

/* COMPOSER */
.composer {
  background: rgba(255,255,255,0.07);
  padding:20px;
  border-radius:20px;
  margin-bottom:30px;
}

textarea {
  width:100%;
  min-height:100px;
  border:none;
  border-radius:16px;
  padding:15px;
  resize:none;
}

.post-btn {
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
  border:none;
  padding:10px 20px;
  border-radius:12px;
  color:white;
  cursor:pointer;
}

/* POST CARD */
.post-card {
  background: rgba(255,255,255,0.08);
  padding:20px;
  border-radius:20px;
  margin-bottom:25px;
}

.post-header {
  display:flex;
  gap:15px;
  align-items:center;
}

.media {
  width:100%;
  border-radius:16px;
  margin-top:15px;
}

.post-actions {
  margin-top:15px;
  display:flex;
  gap:20px;
}

.post-actions button {
  background:none;
  border:none;
  color:white;
  cursor:pointer;
}

/* MOBILE */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar, .rightbar {
    display:none;
  }
}
</style>


