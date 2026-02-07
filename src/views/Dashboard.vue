<template>
  <div class="dashboard">
    <div class="top-bar">
      <h1>Dashboard</h1>
      <button class="btn" @click="logout">Logout</button>
    </div>

    <section class="create">
      <h2>Create Voice</h2>

      <textarea
        v-model="content"
        placeholder="Say something..."
      ></textarea>

      <button class="btn primary" @click="postVoice">
        Post
      </button>
    </section>

    <section class="voices">
      <h2>Your Voices</h2>

      <p v-if="voices.length === 0">No voices yet</p>

      <div
        v-for="voice in voices"
        :key="voice.id"
        class="voice-card"
      >
        <p>{{ voice.content }}</p>

        <button class="btn danger" @click="deleteVoice(voice.id)">
          Delete
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import api from "../services/api";

export default {
  data() {
    return {
      content: "",
      voices: [],
    };
  },

  async mounted() {
    await this.loadVoices();
  },

  methods: {
    async loadVoices() {
      const res = await api.get("/voices");
      this.voices = res.data;
    },

    async postVoice() {
      if (!this.content.trim()) return;

      const res = await api.post("/voices", {
        content: this.content,
        type: "text",
      });

      // 👇 THIS is what was missing
      this.voices.unshift(res.data);
      this.content = "";
    },

    async deleteVoice(id) {
      await api.delete(`/voices/${id}`);
      this.voices = this.voices.filter(v => v.id !== id);
    },

    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.dashboard {
  max-width: 600px;
  margin: auto;
  padding: 24px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

textarea {
  width: 100%;
  min-height: 100px;
  margin: 12px 0;
  padding: 12px;
  font-size: 16px;
}

.voice-card {
  border-top: 1px solid #eee;
  padding: 12px 0;
}

.btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
}

.primary {
  background: #007aff;
  color: white;
}

.danger {
  background: #ff3b30;
  color: white;
}
</style>

