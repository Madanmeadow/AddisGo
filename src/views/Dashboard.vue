<template>
  <div class="tiktok-container">

    <div
      v-for="(post, index) in posts"
      :key="index"
      class="video-wrapper"
    >
      <video
        :src="post.video"
        autoplay
        muted
        loop
        playsinline
        class="video"
      ></video>

      <!-- Overlay Info -->
      <div class="overlay">
        <div class="left-info">
          <h3>@{{ post.user }}</h3>
          <p>{{ post.caption }}</p>
        </div>

        <div class="right-actions">
          <button>❤️ {{ post.likes }}</button>
          <button>💬 {{ post.comments }}</button>
          <button>🔗 Share</button>
        </div>
      </div>

    </div>

  </div>
</template>

<script>
export default {
  data() {
    return {
      posts: [
        {
          user: "AddisGo",
          caption: "Welcome to AddisGo 🚀",
          video: "myvideo2.mp4",
          likes: 120,
          comments: 30
        },
        {
          user: "Minneapolis",
          caption: "Streets of Minneapolis 🌆",
          video: "myvideo1.mp4",
          likes: 210,
          comments: 50
        }
      ]
    }
  }
}
</script>

<style scoped>

.tiktok-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.video-wrapper {
  position: relative;
  height: 100vh;
  scroll-snap-align: start;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  color: white;
}

.left-info {
  max-width: 60%;
}

.right-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.right-actions button {
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 50px;
  cursor: pointer;
}

</style>


