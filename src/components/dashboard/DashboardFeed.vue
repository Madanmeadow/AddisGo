<script setup>
import { ref, onMounted } from "vue";
import api from "../../services/api";

const feed = ref([]);

onMounted(async () => {
  const res = await api.get("/api/feed");
  feed.value = res.data;
});
</script>

<template>
  <div class="feed">
    <div v-for="item in feed" :key="item.id" class="post">
      <video
        v-if="item.type === 'video'"
        :src="item.url"
        autoplay
        muted
        loop
        controls
      />
      <p v-else>{{ item.content }}</p>

      <div class="actions">
        ❤️ {{ item.likes || 0 }}
        💬 {{ item.comments || 0 }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
}

.post {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
