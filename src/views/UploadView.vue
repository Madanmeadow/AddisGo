<template>
  <div class="upload-page">
    <h1>Upload Video</h1>

    <form @submit.prevent="submit">
      <input v-model="title" placeholder="Video title" required />
      <input v-model="username" placeholder="Username" required />
      <input type="file" @change="onFile" accept="video/*" required />

      <button :disabled="loading">
        {{ loading ? "Uploading..." : "Upload" }}
      </button>
    </form>

    <p v-if="success" class="success">Uploaded successfully 🎉</p>
  </div>
</template>

<script>
import { ref } from "vue";
import { uploadVideo } from "@/services/videoService";

export default {
  name: "UploadView",
  setup() {
    const title = ref("");
    const username = ref("");
    const file = ref(null);
    const loading = ref(false);
    const success = ref(false);

    const onFile = (e) => {
      file.value = e.target.files[0];
    };

    const submit = async () => {
      loading.value = true;
      success.value = false;

      const formData = new FormData();
      formData.append("title", title.value);
      formData.append("username", username.value);
      formData.append("video", file.value);

      await uploadVideo(formData);

      // 🔥 notify Explore to refresh
      window.dispatchEvent(new Event("video-uploaded"));

      loading.value = false;
      success.value = true;
    };

    return {
      title,
      username,
      file,
      loading,
      success,
      onFile,
      submit
    };
  }
};
</script>

<style scoped>
.upload-page {
  max-width: 500px;
  margin: 60px auto;
}

input {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  padding: 10px;
}

button {
  padding: 10px 18px;
}

.success {
  color: green;
  margin-top: 12px;
}
</style>
