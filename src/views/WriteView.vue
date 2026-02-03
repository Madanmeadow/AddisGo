<template>
  <div class="page">
    <h1>✍️ Write Your Voice</h1>
    <p>Say what needs to be said.</p>

    <textarea
      v-model="text"
      placeholder="Start writing your voice here…"
    ></textarea>

    <button @click="submit">Save Voice</button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const text = ref("");

const submit = () => {
  if (!text.value.trim()) {
    alert("Your voice can’t be empty 💙");
    return;
  }

  alert("Voice saved (next step: backend 🔥)");
  text.value = "";
};
</script>

<style scoped>
.page {
  padding: 40px;
  max-width: 700px;
  margin: auto;
}

textarea {
  width: 100%;
  height: 200px;
  padding: 16px;
  font-size: 16px;
  border-radius: 10px;
  margin: 20px 0;
}

button {
  padding: 12px 24px;
  font-size: 16px;
}
</style>
