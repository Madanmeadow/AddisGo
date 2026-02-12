<template>
  <div class="feed">

    <div class="upload-box">
      <input type="text" v-model="title" placeholder="Video title" />
      <input type="file" @change="handleFile" />
      <button @click="uploadVideo">Upload</button>
    </div>

    <div 
      v-for="video in videos" 
      :key="video.id"
      class="video-container"
    >
      <video 
        :src="`http://localhost:5000${video.url}`"
        controls
        autoplay
        loop
      ></video>
      <h3>{{ video.title }}</h3>
    </div>

  </div>
</template>

<script>
import axios from "axios"

export default {
  data() {
    return {
      title: "",
      file: null,
      videos: []
    }
  },
  mounted() {
    this.fetchVideos()
  },
  methods: {
    handleFile(e) {
      this.file = e.target.files[0]
    },
    async uploadVideo() {
      const formData = new FormData()
      formData.append("title", this.title)
      formData.append("video", this.file)

      await axios.post(
        "http://localhost:5000/api/videos/upload",
        formData
      )

      this.fetchVideos()
    },
    async fetchVideos() {
      const res = await axios.get(
        "http://localhost:5000/api/videos"
      )
      this.videos = res.data
    }
  }
}
</script>

<style>
.feed {
  height: 100vh;
  overflow-y: scroll;
}

.video-container {
  height: 100vh;
  scroll-snap-align: start;
}

video {
  width: 100%;
  height: 90%;
  object-fit: cover;
}
</style>


