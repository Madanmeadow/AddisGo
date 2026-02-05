<template>
  <div class="video-container" ref="container">
    <video
      ref="video"
      :src="video.src"
      playsinline
      muted
      loop
    ></video>

    <div class="overlay">
      <p class="creator">{{ video.creator }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  video: Object,
});

const videoEl = ref(null);
const container = ref(null);
let observer;

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        videoEl.value.play();
      } else {
        videoEl.value.pause();
      }
    },
    { threshold: 0.75 }
  );

  observer.observe(container.value);
});

onBeforeUnmount(() => {
  observer.disconnect();
});
</script>

<style scoped>
.video-container {
  position: relative;
  height: 100vh;
  width: 100%;
  scroll-snap-align: start;
  background: black;
}

video {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  bottom: 80px;
  left: 20px;
  color: white;
}

.creator {
  font-size: 16px;
  font-weight: bold;
}
</style>
