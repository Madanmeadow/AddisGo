<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const videos = ref([
  { id: 1, url: "/videos/sample1.mp4" },
  { id: 2, url: "/videos/sample2.mp4" },
  { id: 3, url: "/videos/sample3.mp4" }
]);

const logout = () => {
  localStorage.removeItem("token");
  router.push("/login");
};

onMounted(() => {
  const vids = document.querySelectorAll("video");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.75 }
  );

  vids.forEach(v => observer.observe(v));
});
</script>

<template>
  <div class="dashboard">
    <button class="logout" @click="logout">Logout</button>

    <div class="feed">
      <div
        v-for="v in videos"
        :key="v.id"
        class="video-card"
      >
        <video
          :src="v.url"
          muted
          loop
          playsinline
        ></video>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  height: 100vh;
  overflow: hidden;
}

.logout {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.feed {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.video-card {
  height: 100vh;
  scroll-snap-align: start;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

