<template>
  <div class="feed">
    <VideoCard
      v-for="post in posts"
      :key="post.id"
      :post="post"
    />
  </div>
</template>

<script>
import VideoCard from "./VideoCard.vue"

export default {
  components: { VideoCard },

  data() {
    return {
      posts: []
    }
  },

  async mounted() {
    await this.fetchPosts()
  },

  methods: {
    async fetchPosts() {
      const API = import.meta.env.VITE_API_URL

      const res = await fetch(`${API}/posts`)
      const data = await res.json()

      this.posts = data
    }
  }
}
</script>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>

