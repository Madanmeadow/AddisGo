<template>
  <div class="dashboard">

    <!-- HEADER -->
    <header class="topbar">
      <div class="logo">🔥 AddisGo</div>

      <div class="nav-center">
        <input v-model="search" placeholder="Search posts..." />
      </div>

      <div class="nav-right">
        <div class="avatar">{{ userInitial }}</div>
        <button class="logout-btn" @click="logout">Logout</button>
      </div>
    </header>

    <div class="layout">

      <!-- SIDEBAR -->
      <aside class="sidebar">
        <ul>
          <li class="active">🏠 Home</li>
          <li>🔥 Trending</li>
          <li>👥 Friends</li>
          <li>🎥 Videos</li>
          <li>💬 Inbox</li>
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
          v-for="post in filteredPosts"
          :key="post.id"
          class="post-card"
        >
          <div class="post-header">
            <div class="avatar small">
              {{ post.name?.charAt(0) || "U" }}
            </div>
            <div>
              <h4>{{ post.name }}</h4>
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
          </div>
        </div>

      </main>

      <!-- RIGHT -->
      <aside class="rightbar">
        <div class="widget">
          <h3>🔥 Trending</h3>
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
      apiUrl: import.meta.env.VITE_API_URL,
      caption: "",
      file: null,
      posts: [],
      loading: false,
      search: "",
      user: JSON.parse(localStorage.getItem("user"))
    }
  },

  computed: {
    userInitial() {
      return this.user?.name?.charAt(0) || "U"
    },
    filteredPosts() {
      return this.posts.filter(p =>
        p.caption?.toLowerCase().includes(this.search.toLowerCase())
      )
    }
  },

  mounted() {
    this.fetchPosts()
  },

  methods: {

    async fetchPosts() {
      try {
        const res = await fetch(`${this.apiUrl}/posts`)

        if (!res.ok) {
          console.error("Fetch posts failed")
          return
        }

        const data = await res.json()
        this.posts = data

      } catch (err) {
        console.error("Fetch error:", err)
      }
    },

    handleFile(e) {
      this.file = e.target.files[0]
    },

    async createPost() {
      try {
        this.loading = true

        const token = localStorage.getItem("token")
        if (!token) {
          alert("You are not logged in")
          return
        }

        const formData = new FormData()
        formData.append("caption", this.caption)

        if (this.file) {
          formData.append("media", this.file)
        }

        const res = await fetch(`${this.apiUrl}/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        if (!res.ok) {
          const text = await res.text()
          console.error("Server response:", text)
          throw new Error("Post failed")
        }

        const data = await res.json()

        this.caption = ""
        this.file = null
        await this.fetchPosts()

      } catch (err) {
        alert(err.message)
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
  min-height:100vh;
  background:linear-gradient(135deg,#14143c,#1e1e5c);
  color:white;
  font-family:Segoe UI;
}

.topbar {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:20px 40px;
  background:rgba(0,0,0,0.4);
}

.logo { font-size:24px;font-weight:bold }

.nav-center input {
  padding:8px 16px;
  border-radius:20px;
  border:none;
}

.nav-right {
  display:flex;
  align-items:center;
  gap:15px;
}

.avatar {
  width:40px;height:40px;
  border-radius:50%;
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  display:flex;align-items:center;justify-content:center;
}

.small { width:35px;height:35px }

.logout-btn {
  background:#ff416c;
  border:none;
  padding:8px 14px;
  border-radius:8px;
  color:white;
  cursor:pointer;
}

.layout {
  display:grid;
  grid-template-columns:220px 1fr 260px;
  gap:25px;
  padding:40px;
}

.sidebar ul { list-style:none;padding:0 }

.sidebar li {
  padding:12px;
  border-radius:10px;
  cursor:pointer;
}

.sidebar li:hover,
.active {
  background:rgba(255,255,255,0.15);
}

.feed { max-width:750px;margin:auto }

.composer,
.post-card,
.widget {
  background:rgba(255,255,255,0.08);
  border-radius:20px;
  padding:20px;
  margin-bottom:25px;
}

textarea {
  width:100%;
  min-height:100px;
  border:none;
  border-radius:16px;
  padding:12px;
}

.post-btn {
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  border:none;
  padding:10px 20px;
  border-radius:12px;
  color:white;
  cursor:pointer;
}

.media {
  width:100%;
  border-radius:16px;
  margin-top:15px;
}

@media(max-width:950px){
  .layout{grid-template-columns:1fr;}
  .sidebar,.rightbar{display:none;}
}
</style>