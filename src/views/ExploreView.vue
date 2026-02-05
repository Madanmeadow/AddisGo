<template>
  <div class="explore">
    <div
      v-for="(video, index) in videos"
      :key="index"
      class="video-card"
    >
      <video
        :src="video.url"
        controls
        autoplay
        muted
        loop
        playsinline
      ></video>
    </div>
  </div>
</template>

<script>
export default {
  name: "ExploreView",
  data() {
    return {
      videos: []
    };
  },
  async mounted() {
    const res = await fetch("http://localhost:5000/api/videos");
    this.videos = await res.json();
  }
};
</script>

<style scoped>
.explore {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 20px;
}

.video-card {
  width: 360px;
  max-width: 100%;
}

video {
  width: 100%;
  border-radius: 14px;
  background: black;
}
</style>


