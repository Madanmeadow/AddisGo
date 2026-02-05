<template>
  <div class="feed">
    <div
      class="video-wrapper"
      v-for="video in videos"
      :key="video.id"
    >
      <video
        class="video"
        :src="video.src"
        playsinline
        muted
        loop
        preload="metadata"
        @click="togglePlay($event)"
      ></video>

      <!-- Overlay -->
      <div class="overlay">
        <div class="creator">@{{ video.creator }}</div>
        <div class="caption">{{ video.caption }}</div>

        <div class="actions">
          <button>❤️ {{ video.likes }}</button>
          <button>💬 {{ video.comments }}</button>
          <button>↗️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ExploreView",
  data() {
    return {
      videos: [
        {
          id: 1,
          src: "/videos/sample1.mp4",
          creator: "creator1",
          caption: "My first MeDan video 🔥",
          likes: 120,
          comments: 18
        },
        {
          id: 2,
          src: "/videos/sample2.mp4",
          creator: "creator2",
          caption: "Real stories only 💯",
          likes: 340,
          comments: 41
        },
        {
          id: 3,
          src: "/videos/sample3.mp4",
          creator: "creator3",
          caption: "Built with love ❤️",
          likes: 98,
          comments: 9
        }
      ]
    };
  },
  mounted() {
    this.autoPlayVisible();
    window.addEventListener("scroll", this.autoPlayVisible);
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.autoPlayVisible);
  },
  methods: {
    togglePlay(e) {
      const video = e.target;
      video.paused ? video.play() : video.pause();
    },
    autoPlayVisible() {
      const videos = document.querySelectorAll("video");
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          video.play();
        } else {
          video.pause();
        }
      });
    }
  }
};
</script>

<style scoped>
/* =====================
   FEED
===================== */
.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

/* =====================
   VIDEO WRAPPER
===================== */
.video-wrapper {
  height: 100vh;
  position: relative;
  scroll-snap-align: start;
  background: black;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* =====================
   OVERLAY
===================== */
.overlay {
  position: absolute;
  bottom: 80px;
  left: 16px;
  right: 16px;
  color: white;
}

.creator {
  font-weight: 700;
  margin-bottom: 6px;
}

.caption {
  font-size: 0.95rem;
  max-width: 80%;
}

/* =====================
   ACTIONS
===================== */
.actions {
  position: absolute;
  right: 12px;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.actions button {
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 50%;
  font-size: 14px;
}
</style>
