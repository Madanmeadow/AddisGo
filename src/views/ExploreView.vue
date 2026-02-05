<template>
  <div class="explore">
    <h1>Explore</h1>

    <div class="grid">
      <div
        v-for="video in videos"
        :key="video.id"
        class="card"
      >
        <img
          :src="video.thumbnail_url"
          alt="thumbnail"
          class="thumb"
        />
        <h4>{{ video.title }}</h4>
        <p>@{{ video.username }}</p>
      </div>
    </div>

    <p v-if="loading" class="status">Loading more videos...</p>
    <p v-if="!hasMore" class="status">You’re all caught up 🎉</p>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import { getExploreVideos } from "@/services/videoService";

export default {
  name: "ExploreView",
  setup() {
    const videos = ref([]);
    const page = ref(1);
    const loading = ref(false);
    const hasMore = ref(true);

    const loadVideos = async () => {
      if (loading.value || !hasMore.value) return;

      loading.value = true;
      const newVideos = await getExploreVideos(page.value, 6);

      if (newVideos.length === 0) {
        hasMore.value = false;
      } else {
        videos.value.push(...newVideos);
        page.value++;
      }

      loading.value = false;
    };

    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200;

      if (nearBottom) {
        loadVideos();
      }
    };

    onMounted(() => {
      loadVideos();
      window.addEventListener("scroll", onScroll);
    });

    onUnmounted(() => {
      window.removeEventListener("scroll", onScroll);
    });

    return {
      videos,
      loading,
      hasMore
    };
  }
};
</script>

<style scoped>
.explore {
  padding: 40px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.card {
  background: #fafafa;
  border-radius: 14px;
  padding: 12px;
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
}

.thumb {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 8px;
}

.status {
  text-align: center;
  margin: 30px 0;
  color: #6b7280;
}
</style>
