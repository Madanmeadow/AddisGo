<template>
  <div class="dashboard">

    <!-- TOP NAV -->
    <header class="topbar">
      <div class="logo">🔥 AddisGo</div>

      <div class="nav-center">
        <input v-model="search" placeholder="Search posts..." />
      </div>

      <div class="nav-right">
        <div class="profile">
          <div class="avatar">{{ userInitial }}</div>
          <span>{{ user?.name }}</span>
        </div>

        <button class="logout-btn" @click="logout">
          Logout
        </button>
      </div>
    </header>

    <!-- MAIN LAYOUT -->
    <div class="layout">

      <!-- SIDEBAR -->
      <aside class="sidebar">
        <ul>
          <li class="active">🏠 Home</li>
          <li>🔥 Trending</li>
          <li>👥 Friends</li>
          <li>🎥 Videos</li>
          <li @click="$router.push('/inbox')">💬 Inbox</li>
          <li @click="$router.push('/video-call')">📞 Live Call</li>
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
          v-for="post in filteredPosts"
          :key="post.id"
          class="post-card glass"
        >
          <div class="post-header">
            <div class="avatar small">
              {{ post.name?.charAt(0) || "U" }}
            </div>
            <div>
              <h4>{{ post.name }}</h4>
              <small>{{ formatDate(post.created_at) }}</small>
            </div>

            <button
              v-if="post.user_id === user?.id"
              class="delete-btn"
              @click="deletePost(post.id)"
            >
              🗑
            </button>
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

            <button @click="toggleComments(post)">
              💬 Comment
            </button>

            <button @click="sharePost(post)">
              🔁 Share
            </button>
          </div>

          <div v-if="post.showComments" class="comments">
            <input
              v-model="post.newComment"
              placeholder="Write a comment..."
              @keyup.enter="addComment(post)"
            />
            <ul>
              <li v-for="(c, index) in post.comments" :key="index">
                {{ c }}
              </li>
            </ul>
          </div>
        </div>

      </main>

      <!-- RIGHT BAR -->
      <aside class="rightbar">
        <div class="widget glass">
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
      const res = await fetch(`${this.apiUrl}/posts`)
      this.posts = await res.json()

      // Initialize comment UI
      this.posts.forEach(p => {
        p.comments = []
        p.newComment = ""
        p.showComments = false
      })
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

        const data = await res.json()
        if (!res.ok) throw new Error(data.message)

        this.caption = ""
        this.file = null
        await this.fetchPosts()

      } catch (err) {
        alert(err.message || "Failed to post")
      } finally {
        this.loading = false
      }
    },

    likePost(post) {
      post.likes = (post.likes || 0) + 1
    },

    toggleComments(post) {
      post.showComments = !post.showComments
    },

    addComment(post) {
      if (!post.newComment) return
      post.comments.push(post.newComment)
      post.newComment = ""
    },

    sharePost(post) {
      navigator.clipboard.writeText(window.location.href)
      alert("Post link copied!")
    },

    async deletePost(id) {
      if (!confirm("Delete this post?")) return

      await fetch(`${this.apiUrl}/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })

      this.fetchPosts()
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
  background:linear-gradient(135deg,#161637,#24246b);
  color:white;
  font-family:'Segoe UI',sans-serif;
}

.topbar {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:20px 40px;
  background:rgba(0,0,0,0.4);
}

.logo { font-size:26px; font-weight:bold; }

.nav-center input {
  padding:8px 16px;
  border-radius:20px;
  border:none;
}

.nav-right {
  display:flex;
  align-items:center;
  gap:20px;
}

.avatar {
  width:40px;
  height:40px;
  border-radius:50%;
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
}

.small { width:35px; height:35px; }

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

.sidebar ul {
  list-style:none;
  padding:0;
}

.sidebar li {
  padding:12px;
  border-radius:10px;
  cursor:pointer;
}

.sidebar li:hover,
.active {
  background:rgba(255,255,255,0.15);
}

.feed {
  max-width:750px;
  margin:auto;
}

.glass {
  background:rgba(255,255,255,0.08);
  backdrop-filter:blur(12px);
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

.post-card { position:relative; }

.post-header {
  display:flex;
  align-items:center;
  gap:15px;
}

.delete-btn {
  margin-left:auto;
  background:none;
  border:none;
  color:red;
  cursor:pointer;
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

.comments input {
  width:100%;
  margin-top:10px;
  padding:8px;
  border-radius:8px;
  border:none;
}

@media(max-width:950px){
  .layout{grid-template-columns:1fr;}
  .sidebar,.rightbar{display:none;}
}
</style>
