<template>
  <div class="upload">
    <h2>Upload a Video</h2>

    <input type="file" accept="video/*" @change="handleFile" />
    <input
      v-model="caption"
      placeholder="Write a caption..."
      class="caption-input"
    />

    <button @click="upload" :disabled="!file">
      Upload
    </button>
  </div>
</template>

<script>
export default {
  name: "UploadView",
  data() {
    return {
      file: null,
      caption: ""
    };
  },
  methods: {
    handleFile(e) {
      this.file = e.target.files[0];
    },
    upload() {
      const reader = new FileReader();

      reader.onload = () => {
        const videos = JSON.parse(localStorage.getItem("videos")) || [];

        videos.unshift({
          id: Date.now(),
          src: reader.result,
          creator: "you",
          caption: this.caption || "New video 🎬",
          likes: 0,
          comments: 0
        });

        localStorage.setItem("videos", JSON.stringify(videos));

        window.dispatchEvent(new Event("videos-updated"));

        this.$router.push("/explore");
      };

      reader.readAsDataURL(this.file);
    }
  }
};
</script>

<style scoped>
.upload {
  max-width: 400px;
  margin: 80px auto;
  text-align: center;
}

input {
  width: 100%;
  margin-bottom: 12px;
}

.caption-input {
  padding: 10px;
}

button {
  background: #6c6cff;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
}
</style>
