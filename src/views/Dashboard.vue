<script setup>
const videos = [
  "/videos/1.mp4",
  "/videos/2.mp4",
  "/videos/3.mp4"
];
</script>

<template>
  <div class="feed">
    <video
      v-for="(v, i) in videos"
      :key="i"
      :src="v"
      autoplay
      muted
      loop
      controls
      class="video"
    />
  </div>
</template>

<style>
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

