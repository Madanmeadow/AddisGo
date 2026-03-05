<script setup>
import { ref, onMounted } from "vue"

const videos = ref([])

const API_URL = "https://addisgo-production-6a3e.up.railway.app"

const fetchVideos = async () => {
  try {
    const res = await fetch(`${API_URL}/api/videos`)
    const data = await res.json()
    videos.value = data
  } catch (err) {
    console.error("Failed to fetch videos", err)
  }
}

onMounted(fetchVideos)
</script>

<template>
  <div class="feed">
    <h1>Pulse Feed 🔥</h1>

    <div v-for="video in videos" :key="video.id" class="video-card">
      
      <h3>{{ video.name }}</h3>
      <p>{{ video.caption }}</p>

      <video
        v-if="video.video_url"
        controls
        width="100%"
        style="border-radius: 10px;"
      >
        <source :src="video.video_url" type="video/mp4" />
      </video>

      <small>{{ new Date(video.created_at).toLocaleString() }}</small>

    </div>
  </div>
</template>

<style scoped>
.feed {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

.video-card {
  margin-bottom: 30px;
  padding: 15px;
  background: #111;
  color: white;
  border-radius: 12px;
}
</style>
