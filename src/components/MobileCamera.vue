<template>
  <div class="camera-container">
    <input
      ref="cameraInput"
      type="file"
      accept="image/*,video/*"
      capture="environment"
      hidden
      @change="onCapture"
    />

    <button class="btn capture" @click="openCamera">
      📸 Open Camera
    </button>

    <div v-if="previewUrl" class="preview">
      <img v-if="isImage" :src="previewUrl" />
      <video v-else controls :src="previewUrl"></video>
    </div>

    <button v-if="file" class="btn upload" @click="uploadMedia">
      🚀 Upload
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const cameraInput = ref(null);
const file = ref(null);
const previewUrl = ref(null);
const isImage = ref(true);

const openCamera = () => {
  cameraInput.value.click();
};

const onCapture = (e) => {
  file.value = e.target.files[0];
  if (!file.value) return;

  isImage.value = file.value.type.startsWith("image");
  previewUrl.value = URL.createObjectURL(file.value);
};

const uploadMedia = async () => {
  const formData = new FormData();
  formData.append("media", file.value);

  const res = await fetch(
    import.meta.env.VITE_API_BASE_URL + "/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();
  alert("Uploaded ✅ " + data.file);
};
</script>

<style scoped>
.camera-container {
  padding: 20px;
}

.btn {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  margin-top: 12px;
  border-radius: 10px;
  border: none;
}

.capture {
  background: #000;
  color: white;
}

.upload {
  background: #28a745;
  color: white;
}

.preview img,
.preview video {
  width: 100%;
  margin-top: 12px;
  border-radius: 12px;
}
</style>
