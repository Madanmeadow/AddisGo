<template>
  <div ref="container" class="video-card">
    <video
      ref="video"
      :src="videoUrl"
      muted
      playsinline
      loop
      preload="metadata"
      class="video"
    ></video>
  </div>
</template>

<script>
export default {
  props: {
    videoUrl: String
  },

  mounted() {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.$refs.video.play();
        } else {
          this.$refs.video.pause();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(this.$refs.container);
  }
};
</script>

<style scoped>
.video-card {
  margin-bottom: 30px;
}

.video {
  width: 100%;
  border-radius: 14px;
  background: black;
}
</style>
