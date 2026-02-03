<template>
  <div class="video-page">
    <h2>Record your voice — on video 🎥</h2>

    <video ref="video" autoplay playsinline></video>

    <div class="controls">
      <button @click="startRecording" :disabled="recording">
        ▶️ Start
      </button>

      <button @click="stopRecording" :disabled="!recording">
        ⏹ Stop
      </button>
    </div>

    <p v-if="saved">✅ Video recorded (local only)</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const video = ref(null);
const mediaRecorder = ref(null);
const chunks = ref([]);
const recording = ref(false);
const saved = ref(false);

onMounted(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  video.value.srcObject = stream;

  mediaRecorder.value = new MediaRecorder(stream);
  mediaRecorder.value.ondataavailable = (e) => chunks.value.push(e.data);
  mediaRecorder.value.onstop = saveVideo;
});

const startRecording = () => {
  chunks.value = [];
  mediaRecorder.value.start();
  recording.value = true;
  saved.value = false;
};

const stopRecording = () => {
  mediaRecorder.value.stop();
  recording.value = false;
};

const saveVideo = () => {
  const blob = new Blob(chunks.value, { type: "video/webm" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "medan-video.webm";
  a.click();

  saved.value = true;
};
</script>

<style scoped>
.video-page {
  text-align: center;
  padding: 40px;
}

video {
  width: 100%;
  max-width: 480px;
  border-radius: 12px;
  margin: 20px 0;
  background: black;
}

.controls button {
  margin: 10px;
  padding: 12px 20px;
  font-size: 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
</style>
