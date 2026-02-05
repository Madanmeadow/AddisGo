<template>
  <div class="comments">
    <h4>Comments ({{ comments.length }})</h4>

    <div class="comment" v-for="c in comments" :key="c.id">
      💬 {{ c.text }}
    </div>

    <input
      v-model="newComment"
      placeholder="Add a comment..."
      @keyup.enter="submitComment"
    />
  </div>
</template>

<script>
import axios from "axios";

export default {
  props: ["filename"],
  data() {
    return {
      comments: [],
      newComment: ""
    };
  },
  mounted() {
    this.fetchComments();
  },
  methods: {
    async fetchComments() {
      const res = await axios.get(
        `/api/comments/${this.filename}`
      );
      this.comments = res.data;
    },
    async submitComment() {
      if (!this.newComment.trim()) return;

      const res = await axios.post(
        `/api/comments/${this.filename}`,
        { text: this.newComment }
      );

      this.comments.push(res.data);
      this.newComment = "";
    }
  }
};
</script>

<style scoped>
.comments {
  padding: 10px;
  border-top: 1px solid #eee;
}

.comment {
  font-size: 14px;
  margin-bottom: 6px;
}

input {
  width: 100%;
  padding: 8px;
}
</style>
