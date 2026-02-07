<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import VideoCard from "./VideoCard.vue";

const videos = ref([]);

onMounted(async () => {
  const res = await api.get("/feed");
  videos.value = res.data;
});
</script>

<template>
  <div class="feed">
    <VideoCard v-for="v in videos" :key="v.id" :video="v" />
  </div>
</template>

