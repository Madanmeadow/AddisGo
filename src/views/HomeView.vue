<template>
  <div>
    <UploadVideo @uploaded="fetchVideos" />

    <VideoCard
      v-for="v in videos"
      :key="v.url"
      :videoUrl="api + v.url"
    />
  </div>
</template>

<script>
import UploadVideo from "@/components/UploadVideo.vue";
import VideoCard from "@/components/VideoCard.vue";

export default {
  components: { UploadVideo, VideoCard },
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

