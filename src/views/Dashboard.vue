<template>
  <div class="container">
    <div class="header">
      <h1>Dashboard</h1>
      <button class="logout" @click="logout">Logout</button>
    </div>

    <h2>Create Voice</h2>

    <textarea
      v-model="text"
      placeholder="Say something..."
      rows="4"
    />

    <button class="post" @click="postVoice">Post</button>

    <h2>Your Voices</h2>

    <p v-if="voices.length === 0">No voices yet</p>

    <div v-for="v in voices" :key="v.id" class="voice">
      <p>{{ v.content }}</p>
      <small>{{ new Date(v.createdAt).toLocaleString() }}</small>
      <button class="delete" @click="deleteVoice(v.id)">Delete</button>
    </div>
  </div>
</template>

<script>
import api from "../services/api";
import { authHeader, logout } from "../services/auth.service";

export default {
  data() {
    return {
      text: "",
      voices: [],
    };
  },

  async mounted() {
    await this.loadVoices();
  },

  methods: {
    async loadVoices() {
      const res = await api.get("/voices", {
        headers: authHeader(),
      });
      this.voices = res.data;
    },

    async postVoice() {
      if (!this.text.trim()) return;

      await api.post(
        "/voices",
        {
          type: "text",
          content: this.text,
        },
        { headers: authHeader() }
      );

      this.text = "";
      await this.loadVoices();
    },

    async deleteVoice(id) {
      await api.delete(`/voices/${id}`, {
        headers: authHeader(),
      });
      await this.loadVoices();
    },

    logout() {
      logout();
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
}

textarea {
  width: 100%;
  padding: 10px;
  font-size: 16px;
}

.post {
  margin-top: 10px;
  padding: 10px 16px;
  border-radius: 20px;
  border: none;
  background: #007aff;
  color: white;
}

.voice {
  margin-top: 12px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.delete {
  margin-top: 6px;
  background: #eee;
  border: none;
  padding: 6px 10px;
  border-radius: 14px;
}
</style>



