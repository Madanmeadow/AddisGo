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

    <!-- MAIN LAYOUT -->
    <div class="layout">

      <!-- LEFT SIDEBAR -->
      <aside class="sidebar">
        <ul>
          <li class="active">🏠 Home</li>
          <li>🔥 Trending</li>
          <li>👥 Friends</li>
          <li>🎥 Videos</li>
          <li>🎥 Live Call</li>
          <li>⚙ Settings</li>
        </ul>
      </aside>

      <!-- FEED -->
      <main class="feed">

        <!-- CREATE POST -->
        <div class="composer glass">
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
          class="post-card glass"
          v-for="post in posts"
          :key="post.id"
        >
          <div class="post-header">
            <div class="avatar small">
              {{ post.name?.charAt(0) || "U" }}
            </div>
            <div>
              <h4>{{ post.name || "User" }}</h4>
              <small>{{ formatDate(post.created_at) }}</small>
            </div>
          </div>

          <p class="caption">{{ post.caption }}</p>

          <img
            v-if="post.image_url"
            :src="baseUrl + post.image_url"
            class="media"
          />

          <video
            v-if="post.video_url"
            :src="baseUrl + post.video_url"
            controls
            class="media"
          ></video>

          <div class="post-actions">
            <button @click="likePost(post)">
              ❤️ {{ post.likes || 0 }}
            </button>
            <button>💬 Comment</button>
            <button>🔁 Share</button>
          </div>
        </div>

      </main>

      <!-- RIGHT SIDE -->
      <aside class="rightbar">
        <div class="widget glass">
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
    const api = import.meta.env.VITE_API_URL

    return {
      caption: "",
      file: null,
      posts: [],
      loading: false,
      apiUrl: api,
      baseUrl: api.replace("/api", ""), // for media
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
      const res = await fetch(`${this.apiUrl}/posts`)
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

        const res = await fetch(`${this.apiUrl}/posts`, {
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
  background: linear-gradient(135deg,#161637,#24246b);
  color: white;
  font-family: 'Segoe UI', sans-serif;
}

/* GLASS EFFECT */
.glass {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15);
}

/* TOPBAR */
.topbar {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:20px 40px;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(15px);
}

.logo {
  font-size:28px;
  font-weight:bold;
  letter-spacing:1px;
}

.nav-center input {
  padding:10px 18px;
  border-radius:30px;
  border:none;
  width:280px;
  outline:none;
}

.nav-right {
  display:flex;
  align-items:center;
  gap:20px;
}

.avatar {
  width:42px;
  height:42px;
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
}

.small {
  width:36px;
  height:36px;
}

.logout-btn {
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  border:none;
  padding:8px 16px;
  border-radius:10px;
  color:white;
  cursor:pointer;
  transition:0.3s;
}

.logout-btn:hover {
  opacity:0.8;
}

/* LAYOUT */
.layout {
  display:grid;
  grid-template-columns:220px 1fr 260px;
  gap:25px;
  padding:40px;
}

/* SIDEBAR */
.sidebar ul {
  list-style:none;
  padding:0;
}

.sidebar li {
  padding:12px;
  border-radius:10px;
  margin-bottom:8px;
  cursor:pointer;
  transition:0.3s;
}

.sidebar li:hover,
.sidebar .active {
  background: rgba(255,255,255,0.15);
}

/* FEED */
.feed {
  max-width:720px;
  margin:auto;
}

/* COMPOSER */
.composer {
  padding:20px;
  border-radius:20px;
  margin-bottom:30px;
}

textarea {
  width:100%;
  min-height:110px;
  border:none;
  border-radius:16px;
  padding:15px;
  resize:none;
  outline:none;
}

.post-btn {
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  border:none;
  padding:10px 20px;
  border-radius:12px;
  color:white;
  cursor:pointer;
  transition:0.3s;
}

.post-btn:hover {
  opacity:0.8;
}

/* POST CARD */
.post-card {
  padding:20px;
  border-radius:20px;
  margin-bottom:25px;
  transition:0.3s;
}

.post-card:hover {
  transform: translateY(-3px);
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
  font-size:14px;
  transition:0.3s;
}

.post-actions button:hover {
  opacity:0.7;
}

/* RIGHTBAR */
.widget {
  padding:20px;
  border-radius:20px;
}

/* MOBILE */
@media (max-width: 950px) {
  .layout {
    grid-template-columns:1fr;
  }
  .sidebar,
  .rightbar {
    display:none;
  }
}
</style>


