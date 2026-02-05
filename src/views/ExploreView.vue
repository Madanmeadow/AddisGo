<template>
  <div class="feed">
    <div
      v-for="(video, index) in visibleVideos"
      :key="video.id"
      class="video-wrapper"
      :ref="index === visibleVideos.length - 1 ? setLastVideoRef : null"
    >
      <video
        class="video"
        :src="video.src"
        muted
        loop
        playsinline
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
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading more…</div>
  </div>
</template>

<script>
export default {
  name: "ExploreView",
  data() {
    return {
      allVideos: [],
      visibleVideos: [],
      page: 0,
      pageSize: 3,
      loading: false,
      observer: null
    };
  },
  mounted() {
    this.loadAllVideos();
    this.loadNextPage();
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  },
  methods: {
    loadAllVideos() {
      const uploaded = JSON.parse(localStorage.getItem("videos")) || [];

      const demo = [
        {
          id: 1,
          src: "/videos/sample1.mp4",
          creator: "creator1",
          caption: "Welcome to MeDan 🔥",
          likes: 120,
          comments: 18
        },
        {
          id: 2,
          src: "/videos/sample2.mp4",
          creator: "creator2",
          caption: "Real stories only 💯",
          likes: 320,
          comments: 44
        },
        {
          id: 3,
          src: "/videos/sample3.mp4",
          creator: "creator3",
          caption: "Built different 😤",
          likes: 98,
          comments: 12
        }
      ];

      this.allVideos = uploaded.length
        ? [...uploaded, ...demo]
        : demo;
    },

    loadNextPage() {
      if (this.loading) return;
      this.loading = true;

      const start = this.page * this.pageSize;
      const end = start + this.pageSize;

      const next = this.allVideos.slice(start, end);

      if (next.length) {
        this.visibleVideos.push(...next);
        this.page++;
      }

      this.loading = false;
    },

    setLastVideoRef(el) {
      if (this.observer) this.observer.disconnect();

      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.loadNextPage();
          }
        },
        { threshold: 0.8 }
      );

      if (el) this.observer.observe(el);
    },

    togglePlay(e) {
      const video = e.target;
      video.paused ? video.play() : video.pause();
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
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  background: black;
}

/* =====================
   VIDEO WRAPPER
===================== */
.video-wrapper {
  height: 100vh;
  position: relative;
  scroll-snap-align: start;
}

/* =====================
   VIDEO
===================== */
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
  gap: 14px;
}

.actions button {
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 50%;
}

/* =====================
   LOADING
===================== */
.loading {
  text-align: center;
  color: white;
  padding: 20px;
}
</style>


