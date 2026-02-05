<template>
  <div class="feed">
    <VideoItem
      v-for="video in videos"
      :key="video.id"
      :video="video"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import VideoItem from "./VideoItem.vue";
import { getExploreVideos } from "@/services/videoService";

const videos = ref([]);

onMounted(async () => {
  // TEMP MOCK (safe if backend not ready)
  videos.value = [
    {
      id: 1,
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      creator: "@creator1",
    },
    {
      id: 2,
      src: "https://www.w3schools.com/html/movie.mp4",
      creator: "@creator2",
    },
    {
      id: 3,
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      creator: "@creator3",
    },
  ];

  // 🔥 Later replace with real API
  // videos.value = await getExploreVideos();
});
</script>

<style scoped>
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}
</style>
