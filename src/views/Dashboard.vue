<template>
  <Topbar />
  <Sidebar />
  <VideoFeed />
  <MobileBottomNav @upload="showUpload=true" />
  <UploadModal v-if="showUpload" />
</template>

<script setup>
import { ref } from "vue";
import VideoFeed from "@/components/feed/VideoFeed.vue";
import UploadModal from "@/components/upload/UploadModal.vue";
import MobileBottomNav from "@/components/layout/MobileBottomNav.vue";

const showUpload = ref(false);
</script>



