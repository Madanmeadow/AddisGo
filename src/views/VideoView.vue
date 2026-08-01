<template>
  <div class="video-page">
    <h2>🎥 Record Your Voice — on video</h2>

    <div class="video-wrap">
      <video ref="videoEl" autoplay muted playsinline></video>
      <div v-if="recording" class="rec-indicator">● REC {{ formatTime(recordTime) }}</div>
    </div>

    <div class="controls">
      <button @click="startRecording" :disabled="recording || loading">Start</button>
      <button @click="stopRecording" :disabled="!recording">Stop</button>
      <button v-if="videoURL" @click="uploadVideo" :disabled="uploading">
        {{ uploading ? "Saving…" : "Save" }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <video v-if="videoURL" :src="videoURL" controls class="preview"></video>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";
import api from "@/services/api";

const videoEl = ref(null);
const recording = ref(false);
const loading = ref(false);
const uploading = ref(false);
const error = ref("");
const videoURL = ref(null);
const videoBlob = ref(null);
const recordTime = ref(0);

// Plain variables — no need for reactivity
let mediaRecorder = null;
let chunks = [];
let stream = null;
let timerInterval = null;

const startRecording = async () => {
  error.value = "";
  loading.value = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    videoEl.value.srcObject = stream;

    // Use the browser's preferred MIME type
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const type = mediaRecorder.mimeType || "video/webm";
      videoBlob.value = new Blob(chunks, { type });
      videoURL.value = URL.createObjectURL(videoBlob.value);
      chunks = [];
      stopTracks();
    };

    mediaRecorder.onerror = (e) => {
      error.value = "Recording error: " + e.message;
      cleanup();
    };

    mediaRecorder.start(1000); // collect every 1s for smoother recovery
    recording.value = true;
    recordTime.value = 0;
    timerInterval = setInterval(() => recordTime.value++, 1000);
  } catch (err) {
    error.value =
      err.name === "NotAllowedError"
        ? "Camera/mic permission denied."
        : err.name === "NotFoundError"
          ? "No camera found."
          : "Could not start recording: " + err.message;
  } finally {
    loading.value = false;
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  recording.value = false;
  clearInterval(timerInterval);
};

const stopTracks = () => {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (videoEl.value) videoEl.value.srcObject = null;
};

const cleanup = () => {
  stopRecording();
  stopTracks();
  mediaRecorder = null;
  chunks = [];
  clearInterval(timerInterval);
};

const uploadVideo = async () => {
  if (!videoBlob.value) return;
  uploading.value = true;
  error.value = "";

  try {
    const ext = videoBlob.value.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([videoBlob.value], `recording-${Date.now()}.${ext}`, {
      type: videoBlob.value.type,
    });

    const formData = new FormData();
    formData.append("video", file);

    const res = await api.post("/videos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    alert("Saved ✅");
    console.log(res.data);
  } catch (err) {
    error.value = "Upload failed: " + (err.response?.data?.error || err.message);
  } finally {
    uploading.value = false;
  }
};

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

// ✅ Critical: cleanup when component unmounts
onBeforeUnmount(() => {
  cleanup();
  if (videoURL.value) URL.revokeObjectURL(videoURL.value);
});
</script>

<style scoped>
.video-page {
  text-align: center;
  padding: 40px;
}
.video-wrap {
  position: relative;
  display: inline-block;
}
video {
  width: 320px;
  border-radius: 12px;
  background: #000;
}
.rec-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  animation: pulse 1s infinite;
}
.preview {
  margin-top: 20px;
}
.controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
}
.error {
  color: #ef4444;
  margin-top: 10px;
  font-size: 14px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>