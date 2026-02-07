<template>
  <div class="video-card">
    <video controls autoplay muted loop :src="video.url"></video>

    <div class="actions">
      ❤️ {{ video.likes }}
      💬 {{ video.comments.length }}
    </div>

    <button @click="like">Like</button>
  </div>
</template>

<script setup>
import { api } from "@/services/api";

const props = defineProps({ video: Object });

const like = async () => {
  await api.post(`/api/like/${props.video.id}`);
};
</script>

<style>
.video-card video {
  height: 100vh;
  width: 100%;
  object-fit: cover;
}
</style>
