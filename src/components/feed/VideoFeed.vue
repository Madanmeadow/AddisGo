<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";
import VideoCard from "./VideoCard.vue";

const feed = ref([]);

onMounted(async () => {
  feed.value = (await api.get("/api/feed")).data;
});
</script>

<template>
  <VideoCard v-for="v in feed" :key="v.id" :video="v" />
</template>


