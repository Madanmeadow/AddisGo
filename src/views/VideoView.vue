<template>
  <div class="video-page">
    <h2>🎥 Record Your Voice — on video</h2>

    <video ref="videoEl" autoplay muted playsinline></video>

    <div class="controls">
      <button @click="startRecording" :disabled="recording">Start</button>
      <button @click="stopRecording" :disabled="!recording">Stop</button>
      <button v-if="videoURL" @click="uploadVideo">Save</button>
    </div>

    <video v-if="videoURL" :src="videoURL" controls class="preview"></video>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "@/services/api";

const videoEl = ref(null);
const recording = ref(false);
const mediaRecorder = ref(null);
const chunks = ref([]);
const videoURL = ref(null);
const videoBlob = ref(null);

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  videoEl.value.srcObject = stream;
  mediaRecorder.value = new MediaRecorder(stream);

  mediaRecorder.value.ondataavailable = (e) => {
    chunks.value.push(e.data);
  };

  mediaRecorder.value.onstop = () => {
    videoBlob.value = new Blob(chunks.value, { type: "video/webm" });
    videoURL.value = URL.createObjectURL(videoBlob.value);
    chunks.value = [];
  };

  mediaRecorder.value.start();
  recording.value = true;
};

const stopRecording = () => {
  mediaRecorder.value.stop();
  videoEl.value.srcObject.getTracks().forEach(t => t.stop());
  recording.value = false;
};

const uploadVideo = async () => {
  const formData = new FormData();
  formData.append("video", videoBlob.value);

  const res = await api.post("/videos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  alert("Saved ✅");
  console.log(res.data);
};
</script>

<style scoped>
.video-page {
  text-align: center;
  padding: 40px;
}
video {
  width: 320px;
  border-radius: 12px;
}
.preview {
  margin-top: 20px;
}
.controls {
  margin-top: 15px;
}
</style>
