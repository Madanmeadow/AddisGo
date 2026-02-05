<template>
  <div class="upload-page">
    <h1>Upload Video</h1>

    <input type="file" accept="video/*" @change="onFileChange" />

    <button :disabled="uploading" @click="uploadVideo">
      {{ uploading ? "Uploading..." : "Upload" }}
    </button>

    <p v-if="videoUrl">
      ✅ Uploaded:
      <a :href="videoUrl" target="_blank">{{ videoUrl }}</a>
    </p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
      uploading: false,
      videoUrl: null,
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];
    },
    async uploadVideo() {
      if (!this.file) return alert("Select a video first");

      this.uploading = true;

      const formData = new FormData();
      formData.append("video", this.file);

      try {
        const res = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        this.videoUrl = `http://localhost:5000${data.url}`;
      } catch (err) {
        alert("Upload failed");
        console.error(err);
      } finally {
        this.uploading = false;
      }
    },
  },
};
</script>

<style scoped>
.upload-page {
  max-width: 400px;
  margin: 60px auto;
}
button {
  margin-top: 10px;
}
</style>
