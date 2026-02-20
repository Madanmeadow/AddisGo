<template>
  <div class="card">
    <div class="header">
      <div class="avatar">{{ post.user?.name?.charAt(0) }}</div>
      <div>
        <h4>{{ post.user?.name }}</h4>
        <small>{{ new Date(post.created_at).toLocaleString() }}</small>
      </div>
    </div>

    <p class="content">{{ post.content }}</p>

    <video
      v-if="post.video_url"
      controls
      class="video"
      :src="api + post.video_url"
    ></video>

    <ReactionsBar :post="post" />
    <ShareButton />
  </div>
</template>

<script>
import ReactionsBar from "./ReactionsBar.vue"
import ShareButton from "./ShareButton.vue"

export default {
  props: ["post"],
  components: { ReactionsBar, ShareButton },

  data() {
    return {
      api: import.meta.env.VITE_API_URL.replace("/api", "")
    }
  }
}
</script>

<style scoped>
.card {
  background: #2d2f55;
  padding: 20px;
  border-radius: 16px;
  color: white;
}

.header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  background: #ff4d6d;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.video {
  width: 100%;
  border-radius: 12px;
  margin-top: 10px;
}
</style>