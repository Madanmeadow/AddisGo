<template>
  <div class="feed">
    <div
      v-for="(video, index) in videos"
      :key="index"
      class="video-container"
    >
      <!-- ✅ VIDEO GOES HERE -->
      <video
        ref="video"
        :src="video.url"
        muted
        playsinline
        loop
        preload="metadata"
        class="video"
        @click="togglePlay"
      ></video>

      <!-- Example like button -->
      <button class="like-btn">❤️</button>
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
    const res = await axios.get(
      "https://pulse-1.onrender.com/api/videos"
    );
    this.videos = res.data;
  },

  methods: {
    togglePlay(event) {
      const video = event.target;
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  }
};
</script>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-container {
  position: relative;
  width: 360px;
  height: 640px;
  margin-bottom: 24px;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
  border-radius: 14px;
}

.like-btn {
  position: absolute;
  bottom: 20px;
  right: 16px;
  font-size: 22px;
  background: transparent;
  border: none;
  cursor: pointer;
}
</style>
