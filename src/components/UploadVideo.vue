<template>
  <div class="upload-container">
    <h2>Upload Video</h2>

    <form @submit.prevent="handleUpload">
      <input
        type="text"
        v-model="caption"
        placeholder="Video title"
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

    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      caption: "",
      video: null,
      message: ""
    };
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
        formData.append("user_id", 2); // temporary

        const res = await axios.post(
          "https://addisgo-production-6a3e.up.railway.app/api/videos",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          }
        );

        this.message = "🔥 Upload successful!";
        console.log(res.data);

      } catch (err) {
        console.error(err);
        this.message = "❌ Upload failed";
      }
    }
  }
};
</script>
