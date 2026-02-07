<template>
  <div class="feed">
    <div
      class="video-card"
      v-for="video in videos"
      :key="video.id"
    >
      <video
        :src="video.url"
        autoplay
        muted
        loop
        playsinline
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";

const videos = ref([]);

onMounted(async () => {
  const res = await api.get("/videos");
  videos.value = res.data.videos;
});
</script>

<style scoped>
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.video-card {
  height: 100vh;
  scroll-snap-align: start;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

