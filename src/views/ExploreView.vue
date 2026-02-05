<template>
  <div class="feed">
    <video
      v-for="video in videos"
      :key="video"
      :src="video"
      autoplay
      muted
      loop
      playsinline
      class="video"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const videos = ref([]);

onMounted(() => {
  videos.value = [
    "http://localhost:5000/uploads/YOUR_VIDEO_NAME.mp4",
  ];
});
</script>

<style scoped>
.feed {
  height: 100vh;
  overflow-y: scroll;
}
.video {
  width: 100%;
  height: 100vh;
  object-fit: cover;
}
</style>

