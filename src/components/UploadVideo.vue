<template>
  <div class="upload-box">
    <input
      type="file"
      accept="video/*"
      capture
      @change="uploadVideo"
    />
    <p v-if="loading">Uploading… ⏳</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false
    };
  },
  methods: {
    async uploadVideo(e) {
      const file = e.target.files[0];
      if (!file) return;

      this.loading = true;

      const formData = new FormData();
      formData.append("video", file);

      await fetch("https://addisgo-1.onrender.com/api/upload", {
        method: "POST",
        body: formData
      });

      this.loading = false;

      // refresh feed
      this.$emit("uploaded");
    }
  }
};
</script>

<style scoped>
.upload-box {
  padding: 20px;
}
input {
  font-size: 18px;
}
</style>
