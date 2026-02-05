<template>
  <div>
    <UploadVideo @uploaded="fetchVideos" />

    <div v-for="v in videos" :key="v.url" class="video-wrapper">
      <video
        :src="api + v.url"
        muted
        playsinline
        loop
        controls
      ></video>
    </div>
  </div>
</template>

<script>
import UploadVideo from "@/components/UploadVideo.vue";

export default {
  components: { UploadVideo },
  data() {
    return {
      videos: [],
      api: "https://addisgo-1.onrender.com"
    };
  },
  mounted() {
    this.fetchVideos();
  },
  methods: {
    async fetchVideos() {
      const res = await fetch(this.api + "/api/videos");
      this.videos = await res.json();
    }
  }
};
</script>

<style>
.video-wrapper {
  margin: 20px 0;
}
video {
  width: 100%;
  border-radius: 12px;
}
</style>

