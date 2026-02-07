<template>
  <div class="feed">
    <div
      v-for="voice in voices"
      :key="voice.id"
      class="post"
    >
      <p v-if="voice.type === 'text'">
        {{ voice.content }}
      </p>

      <video
        v-if="voice.type === 'video'"
        :src="api + voice.content"
        controls
        playsinline
        class="video"
      ></video>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      voices: [],
      api: "https://addisgo-1.onrender.com"
    };
  },
  async mounted() {
    const res = await fetch(this.api + "/api/voices/public");
    this.voices = await res.json();
  }
};
</script>

<style>
.feed {
  height: 100vh;
  overflow-y: scroll;
}

.post {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
