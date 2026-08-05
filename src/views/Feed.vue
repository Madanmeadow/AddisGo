<template>
  <div class="feed">

    <!-- CREATE POST -->
    <div class="create-post">
      <textarea
        v-model="newPostText"
        placeholder="What's happening?"
        :disabled="isPosting"
      ></textarea>
      <button @click="createPost" :disabled="isPosting">
        {{ isPosting ? 'Posting...' : 'Post' }}
      </button>
    </div>

    <!-- POSTS -->
    <div
      v-for="post in posts"
      :key="post._id"
      class="post-card"
    >
      <h4>{{ post.user?.name || 'Unknown' }}</h4>

      <!-- TEXT -->
      <p v-if="post.text">{{ post.text }}</p>

      <!-- VIDEO -->
      <video
        v-if="post.videoUrl"
        :src="post.videoUrl"
        controls
        muted
        playsinline
        class="video"
      ></video>

      <!-- REACTIONS -->
      <div class="actions">
        <button
          v-for="reaction in reactions"
          :key="reaction.type"
          @click="reactToPost(post, reaction.type)"
          :class="{ active: post.userReaction === reaction.type }"
          :disabled="post._reacting"
        >
          {{ reaction.emoji }} {{ (post.reactions?.[reaction.type] || 0) }}
        </button>

        <button @click="savePost(post)" :disabled="post._saving">
          💾 {{ post.isSaved ? 'Saved' : 'Save' }}
        </button>
        <button @click="sharePost(post)">🔗 Share</button>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <div
          v-for="c in post.comments || []"
          :key="c._id"
          class="comment"
        >
          <strong>{{ c.user?.name || 'User' }}:</strong> {{ c.text }}
        </div>

        <div class="comment-input">
          <input
            v-model="post.newComment"
            placeholder="Write comment..."
            :disabled="post._commenting"
          />
          <button @click="addComment(post)" :disabled="post._commenting">
            {{ post._commenting ? '...' : 'Send' }}
          </button>
        </div>
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
      isPosting: false,
      reactions: [
        { type: 'like', emoji: '❤️' },
        { type: 'fire', emoji: '🔥' },
        { type: 'laugh', emoji: '😂' },
        { type: 'thumbsup', emoji: '👍' },
      ],
    };
  },

  mounted() {
    this.fetchPosts();
  },

  methods: {
    async fetchPosts() {
      try {
        const res = await api.get("/api/posts");
        // Ensure every post has reactive comment input & flags
        this.posts = (res.data || []).map(p => ({
          ...p,
          newComment: "",
          _reacting: false,
          _commenting: false,
          _saving: false,
        }));
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        alert("Could not load feed. Please refresh.");
      }
    },

    async createPost() {
      if (!this.newPostText.trim()) return;
      this.isPosting = true;

      try {
        await api.post("/api/posts/create", {
          text: this.newPostText.trim(),
        });
        this.newPostText = "";
        await this.fetchPosts(); // refresh feed
      } catch (err) {
        console.error("Create post failed:", err);
        alert("Post failed. Please try again.");
      } finally {
        this.isPosting = false;
      }
    },

    async reactToPost(post, reactionType) {
      if (post._reacting) return;
      post._reacting = true;

      // Optimistic UI update
      const previous = post.userReaction;
      const wasSame = previous === reactionType;

      if (!post.reactions) post.reactions = {};
      if (previous) post.reactions[previous] = Math.max(0, (post.reactions[previous] || 1) - 1);
      if (!wasSame) {
        post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
        post.userReaction = reactionType;
      } else {
        post.userReaction = null;
      }

      try {
        await api.put(`/api/posts/${post._id}/react`, { type: reactionType });
      } catch (err) {
        // Rollback on error
        post.userReaction = previous;
        if (wasSame) {
          post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
        } else {
          if (previous) post.reactions[previous] = (post.reactions[previous] || 0) + 1;
          post.reactions[reactionType] = Math.max(0, (post.reactions[reactionType] || 1) - 1);
        }
        console.error("Reaction failed:", err);
        alert("Reaction failed.");
      } finally {
        post._reacting = false;
      }
    },

    async savePost(post) {
      if (post._saving) return;
      post._saving = true;
      const previous = post.isSaved;

      try {
        post.isSaved = !post.isSaved;
        await api.put(`/api/posts/${post._id}/save`);
      } catch (err) {
        post.isSaved = previous;
        console.error("Save failed:", err);
        alert("Save failed.");
      } finally {
        post._saving = false;
      }
    },

    sharePost(post) {
      const url = `${window.location.origin}/post/${post._id}`;
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      }).catch(() => {
        alert("Copy failed.");
      });
    },

    async addComment(post) {
      const text = post.newComment?.trim();
      if (!text) return;

      post._commenting = true;
      try {
        await api.post(`/api/posts/${post._id}/comment`, { text });
        post.newComment = "";
        await this.fetchPosts(); // refresh to show new comment
      } catch (err) {
        console.error("Comment failed:", err);
        alert("Comment failed.");
      } finally {
        post._commenting = false;
      }
    },
  },
};
</script>

<style scoped>
.feed {
  max-width: 600px;
  margin: auto;
  padding: 10px;
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
  background: #222;
  color: #fff;
  border: 1px solid #333;
  border-radius: 6px;
  resize: vertical;
}

button {
  padding: 8px 14px;
  cursor: pointer;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #444;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: #ff4757;
}

.post-card {
  background: #1c1c1c;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  color: #eee;
}

.post-card h4 {
  margin: 0 0 8px 0;
  color: #fff;
}

.video {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
  display: block;
}

.actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.comments {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid #333;
}

.comment {
  font-size: 14px;
  margin-bottom: 8px;
  color: #ccc;
}

.comment strong {
  color: #fff;
  margin-right: 6px;
}

.comment-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.comment-input input {
  flex: 1;
  padding: 8px 10px;
  background: #222;
  color: #fff;
  border: 1px solid #333;
  border-radius: 6px;
}
</style>