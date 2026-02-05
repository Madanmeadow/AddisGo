<template>
  <div class="explore">
    <h2 v-if="videos.length === 0" class="empty">
      No videos yet 👀
    </h2>

    <div class="feed">
      <div
        v-for="video in videos"
        :key="video.url"
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

.empty {
  text-align: center;
  color: #777;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.video-card {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

video {
  width: 100%;
  height: auto;
  border-radius: 12px;
  background: black;
}
</style>

