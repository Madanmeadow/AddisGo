<template>
  <div class="upload-page">
    <h1>Upload Video</h1>

    <input type="file" accept="video/*" @change="handleFile" />

    <button
      :disabled="uploading"
      @click="uploadVideo"
    >
      {{ uploading ? "Uploading..." : "Upload" }}
    </button>

    <p v-if="success" class="success">✅ Upload complete!</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
      uploading: false,
      success: false,
      error: ""
    };
  },
  methods: {
    handleFile(e) {
      this.file = e.target.files[0];
    },
    async uploadVideo() {
      if (!this.file) {
        this.error = "Please select a video";
        return;
      }

      this.uploading = true;
      this.error = "";
      this.success = false;

      const formData = new FormData();
      formData.append("video", this.file);

      try {
        const res = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");

        this.success = true;
        console.log("Uploaded video URL:", data.url);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>

<style scoped>
.upload-page {
  max-width: 400px;
  margin: 50px auto;
  text-align: center;
}

button {
  margin-top: 15px;
  padding: 10px 20px;
}

.success {
  color: green;
}
.error {
  color: red;
}
</style>
