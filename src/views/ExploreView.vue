<template>
  <div class="explore">
    <div v-if="videos.length === 0" class="empty">
      No videos yet 👀
    </div>

    <div
      v-for="(video, index) in videos"
      :key="index"
      class="video-card"
    >
      <!-- ✅ FIXED VIDEO TAG -->
      <video
        :src="video.url"
        controls
        preload="metadata"
        playsinline
        muted
        crossorigin="anonymous"
        class="video-player"
      ></video>

      <div class="actions">
        ❤️ Like
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
      const res = await axios.get(
        "https://addisgo-1.onrender.com/api/videos"
      );
      this.videos = res.data;
    } catch (err) {
      console.error("Failed to load videos", err);
    }
  }
};
</script>

<style scoped>
.explore {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

.video-card {
  margin-bottom: 24px;
}

.video-player {
  width: 100%;
  background: black;
  border-radius: 12px;
}

.actions {
  margin-top: 8px;
  font-size: 16px;
}

.empty {
  text-align: center;
  margin-top: 50px;
  font-size: 18px;
}
</style>

