<template>
  <div class="upload-container">
    <h2>Upload a Video</h2>

    <input
      v-model="title"
      type="text"
      placeholder="Enter title"
      class="input"
    />

    <input
      type="file"
      accept="video/*"
      @change="handleFileChange"
      class="input"
    />

    <button @click="handleUpload" class="btn">
      Upload
    </button>

    <p v-if="error" class="error">❌ {{ error }}</p>
    <p v-if="success" class="success">✅ Upload successful!</p>
  </div>
</template>

<script>
import { uploadVideo } from "../services/videoService";

export default {
  name: "UploadView",

  data() {
    return {
      title: "",
      file: null,
      error: "",
      success: false,
    };
  },

  methods: {
    handleFileChange(event) {
      this.file = event.target.files[0];
    },

    async handleUpload() {
      this.error = "";
      this.success = false;

      if (!this.title || !this.file) {
        this.error = "Please provide title and video file.";
        return;
      }

      try {
        const formData = new FormData();
        formData.append("title", this.title);
        formData.append("video", this.file);

        await uploadVideo(formData);

        this.success = true;
        this.title = "";
        this.file = null;
      } catch (err) {
        console.error(err);
        this.error =
          err.response?.data?.message ||
          "Upload failed. Please try again.";
      }
    },
  },
};
</script>

<style scoped>
.upload-container {
  max-width: 500px;
  margin: auto;
  padding: 20px;
}

.input {
  display: block;
  width: 100%;
  margin-bottom: 15px;
  padding: 10px;
}

.btn {
  width: 100%;
  padding: 12px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}

.error {
  color: red;
  margin-top: 10px;
}

.success {
  color: green;
  margin-top: 10px;
}
</style>

