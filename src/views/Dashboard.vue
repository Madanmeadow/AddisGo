<script setup>
const videos = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
];
</script>

<template>
  <div class="feed">
    <video
      v-for="(v, i) in videos"
      :key="i"
      :src="v"
      controls
      autoplay
      loop
    />
  </div>
</template>

<style>
.feed {
  height: 100vh;
  overflow-y: scroll;
}
video {
  width: 100%;
  height: 100vh;
  object-fit: cover;
}
</style>

