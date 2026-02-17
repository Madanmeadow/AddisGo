<template>
  <div class="feed">

    <!-- CREATE POST -->
    <div class="create-post">
      <textarea
        v-model="newPostText"
        placeholder="What's happening?"
      ></textarea>
      <button @click="createPost">Post</button>
    </div>

    <!-- POSTS -->
    <div
      v-for="post in posts"
      :key="post._id"
      class="post-card"
    >
      <h4>{{ post.user?.name }}</h4>

      <!-- TEXT -->
      <p v-if="post.text">{{ post.text }}</p>

      <!-- VIDEO -->
      <video
        v-if="post.videoUrl"
        :src="post.videoUrl"
        controls
        autoplay
        muted
        playsinline
        class="video"
      ></video>

      <!-- ACTIONS -->
      <div class="actions">
        <button @click="likePost(post)">
          ❤️ {{ post.likes.length }}
        </button>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <div
          v-for="c in post.comments"
          :key="c._id"
          class="comment"
        >
          💬 {{ c.text }}
        </div>

        <input
          v-model="post.newComment"
          placeholder="Write comment..."
        />
        <button @click="addComment(post)">
          Send
        </button>
      </div>

    </div>

  </div>
</template>

<script>
import api from "@/services/api";

export default {
  data() {
    return {
      posts: [],
      newPostText: "",
    };
  },

  mounted() {
    this.fetchPosts();
  },

  methods: {
    async fetchPosts() {
      const res = await api.get("/api/posts");
      this.posts = res.data;
    },

    async createPost() {
      if (!this.newPostText) return;

      await api.post("/api/posts/create", {
        text: this.newPostText,
      });

      this.newPostText = "";
      this.fetchPosts();
    },

    async likePost(post) {
      await api.put(`/api/posts/${post._id}/like`);
      this.fetchPosts();
    },

    async addComment(post) {
      if (!post.newComment) return;

      await api.post(`/api/posts/${post._id}/comment`, {
        text: post.newComment,
      });

      post.newComment = "";
      this.fetchPosts();
    },
  },
};
</script>

<style scoped>
.feed {
  max-width: 600px;
  margin: auto;
}

.create-post {
  background: #111;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}

textarea {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
}

button {
  padding: 8px 12px;
  cursor: pointer;
}

.post-card {
  background: #1c1c1c;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.video {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
}

.actions {
  margin-top: 10px;
}

.comments {
  margin-top: 15px;
}

.comment {
  font-size: 14px;
  margin-bottom: 5px;
}
</style>
