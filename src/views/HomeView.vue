<template>
  <div class="home">

    <!-- Upload Section -->
    <div class="upload-section glass">
      <UploadVideo @uploaded="fetchPosts" />
    </div>

    <!-- Feed Section -->
    <div class="feed">
      <VideoCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :baseUrl="baseUrl"
      />
    </div>

  </div>
</template>

<script>
import UploadVideo from "@/components/UploadVideo.vue"
import VideoCard from "@/components/feed/VideoCard.vue"

export default {
  components: { UploadVideo, VideoCard },

  data() {
    const api = import.meta.env.VITE_API_URL

    return {
      posts: [],
      apiUrl: api,                 // includes /api
      baseUrl: api.replace("/api", "") // for media files
    }
  },

  mounted() {
    this.fetchPosts()
  },

  methods: {
    async fetchPosts() {
      try {
        const res = await fetch(`${this.apiUrl}/posts`)
        this.posts = await res.json()
      } catch (err) {
        console.error("Failed to fetch posts", err)
      }
    }
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 40px;
  background: linear-gradient(135deg,#161637,#24246b);
  color: white;
}

/* Glass style */
.glass {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 30px;
}

.feed {
  max-width: 750px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

/* Mobile */
@media (max-width: 900px) {
  .home {
    padding: 20px;
  }
}
</style>
