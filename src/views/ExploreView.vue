<template>
  <div class="tiktok-feed">
    <div
      v-for="(video, index) in videos"
      :key="video.url"
      class="video-slide"
    >
      <video
        ref="videos"
        class="video"
        :src="video.url"
        muted
        playsinline
        loop
        preload="metadata"
        @click="togglePlay(index)"
      ></video>

      <!-- Overlay -->
      <div class="overlay">
        <div class="filename">{{ video.filename }}</div>

        <div class="actions">
          <button
            class="like-btn"
            :class="{ liked: video.liked }"
            @click.stop="toggleLike(video)"
          >
            ❤️
          </button>
          <span class="likes">{{ video.likes }}</span>
        </div>
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
      videos: [],
      observer: null,
    };
  },

  async mounted() {
    await this.fetchVideos();
    this.$nextTick(this.setupObserver);
  },

  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  },

  methods: {
    async fetchVideos() {
      const res = await axios.get("http://localhost:5000/api/videos");

      // add frontend-only like state
      this.videos = res.data.reverse().map(v => ({
        ...v,
        likes: 0,
        liked: false,
      }));
    },

    setupObserver() {
      this.observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
              video.currentTime = 0;
            }
          });
        },
        { threshold: 0.7 }
      );

      this.$refs.videos.forEach(video =>
        this.observer.observe(video)
      );
    },

    togglePlay(index) {
      const video = this.$refs.videos[index];
      video.paused ? video.play() : video.pause();
    },

    toggleLike(video) {
      video.liked = !video.liked;
      video.likes += video.liked ? 1 : -1;
    },
  },
};
</script>

<style scoped>
.tiktok-feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  background: black;
}

.video-slide {
  height: 100vh;
  scroll-snap-align: start;
  position: relative;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  bottom: 60px;
  left: 16px;
  right: 16px;
  color: white;
}

.filename {
  font-size: 14px;
  opacity: 0.9;
}

.actions {
  position: absolute;
  right: 16px;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.like-btn {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.like-btn.liked {
  transform: scale(1.2);
}

.likes {
  font-size: 14px;
}
</style>

