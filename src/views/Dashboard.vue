<template>
  <div class="dashboard">

    <!-- HEADER -->
    <div class="header">
      <h1>AddisGo 🔥</h1>
    </div>

    <!-- UPLOAD CARD -->
    <div class="card upload-card">
      <h3>Upload a Video</h3>

      <form @submit.prevent="handleUpload">
        <input
          type="text"
          v-model="caption"
          placeholder="Write something..."
          required
        />

        <input
          type="file"
          accept="video/*"
          @change="handleFileChange"
          required
        />

        <button type="submit">Upload</button>
      </form>

      <p v-if="message" class="message">{{ message }}</p>
    </div>

    <!-- FEED -->
    <div class="feed">
      <div
        class="card video-card"
        v-for="video in videos"
        :key="video.id"
      >
        <h4>{{ video.name }}</h4>

        <video
          controls
          :src="apiBase + video.video_url"
        ></video>

        <p class="caption">{{ video.caption }}</p>
      </div>
    </div>

  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      caption: "",
      video: null,
      message: "",
      videos: [],
      apiBase: "https://addisgo-production-6a3e.up.railway.app"
    };
  },

  mounted() {
    this.fetchVideos();
  },

  methods: {
    handleFileChange(e) {
      this.video = e.target.files[0];
    },

    async handleUpload() {
      try {
        const formData = new FormData();
        formData.append("video", this.video);
        formData.append("caption", this.caption);
        formData.append("user_id", 2);

        await axios.post(
          this.apiBase + "/api/videos",
          formData
        );

        this.message = "🔥 Uploaded!";
        this.caption = "";
        this.video = null;

        this.fetchVideos();

      } catch (err) {
        console.error(err);
        this.message = "❌ Upload failed";
      }
    },

    async fetchVideos() {
      const res = await axios.get(
        this.apiBase + "/api/videos"
      );
      this.videos = res.data;
    }
  }
};
</script>

<style scoped>
.dashboard {
  max-width: 600px;
  margin: auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.card {
  background: white;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.upload-card input {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
}

.upload-card button {
  width: 100%;
  padding: 10px;
  background: black;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.video-card video {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
}

.caption {
  margin-top: 8px;
}

.message {
  margin-top: 10px;
  font-weight: bold;
}
</style>


