<script setup>
import api from "@/services/api";
import ReactionsBar from "./ReactionsBar.vue";
import ShareButton from "./ShareButton.vue";

const props = defineProps({ video: Object });

const like = async () => {
  await api.post(`/api/like/${props.video.id}`);
};
</script>

<template>
  <video :src="video.url" controls autoplay muted loop></video>
  ❤️ {{ video.likes }}
  <button @click="like">Like</button>
  <ReactionsBar :video="video" />
  <ShareButton :video="video" />
</template>

<style>
video {
  height: 100vh;
  width: 100%;
  object-fit: cover;
}
</style>
