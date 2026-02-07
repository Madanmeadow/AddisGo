<script setup>
import { ref } from "vue";

const emit = defineEmits(["close"]);

const type = ref("video");
const content = ref("");

const submit = () => {
  console.log({
    type: type.value,
    content: content.value,
  });

  alert("Uploaded (mock)");
  emit("close");
};
</script>

<template>
  <div class="modal">
    <div class="box">
      <h3>Upload</h3>

      <select v-model="type">
        <option value="video">Video URL</option>
        <option value="text">Text Post</option>
      </select>

      <textarea v-model="content" placeholder="Paste video URL or text..." />

      <button @click="submit">Post</button>
      <button @click="$emit('close')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
}

.box {
  background: #111;
  padding: 20px;
  width: 300px;
}
</style>
