<script>
export default {
  name: "ExploreView",
  data() {
    return {
      videos: []
    };
  },
  mounted() {
    this.loadVideos();
    window.addEventListener("videos-updated", this.loadVideos);
    window.addEventListener("scroll", this.autoPlayVisible);
  },
  beforeUnmount() {
    window.removeEventListener("videos-updated", this.loadVideos);
    window.removeEventListener("scroll", this.autoPlayVisible);
  },
  methods: {
    loadVideos() {
      const stored = JSON.parse(localStorage.getItem("videos")) || [];
      const defaults = [
        {
          id: 1,
          src: "/videos/sample1.mp4",
          creator: "creator1",
          caption: "Welcome to MeDan 🔥",
          likes: 120,
          comments: 18
        }
      ];
      this.videos = stored.length ? stored : defaults;
    },
    togglePlay(e) {
      const v = e.target;
      v.paused ? v.play() : v.pause();
    },
    autoPlayVisible() {
      document.querySelectorAll("video").forEach(video => {
        const r = video.getBoundingClientRect();
        r.top >= 0 && r.bottom <= window.innerHeight
          ? video.play()
          : video.pause();
      });
    }
  }
};
</script>

