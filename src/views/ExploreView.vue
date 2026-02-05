<template>
  <div class="explore">
    <h2>Explore Videos</h2>

    <p v-if="videos.length === 0">No videos yet 👀</p>

    <div class="feed">
      <video
        v-for="video in videos"
        :key="video.url"
        :src="video.url"
        controls
        autoplay
        muted
        loop
        class="video"
      ></video>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ExploreView",
  data() {
    return {
      videos: []
    };
  },
  async mounted() {
    try {
      const res = await axios.get("http://localhost:5000/api/videos");
      this.videos = res.data;
    } catch (err) {
      console.error("Failed to load videos", err);
    }
  }
};
</script>

<style scoped>
.explore {
  padding: 20px;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.video {
  width: 100%;
  max-height: 80vh;
  border-radius: 12px;
  background: black;
}
</style>


