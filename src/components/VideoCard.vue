<template>
  <div class="video-card">
    <video controls autoplay muted loop :src="video.url"></video>

    <ReactionsBar :video="video" />
    <ShareButton :video="video" />
  </div>
</template>

<script setup>
import ReactionsBar from "./ReactionsBar.vue";
import ShareButton from "./ShareButton.vue";

defineProps({ video: Object });
</script>
