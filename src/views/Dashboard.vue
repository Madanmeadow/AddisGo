<template>
  <div class="page">
    <h1>Dashboard</h1>

    <button class="logout" @click="logout">Logout</button>

    <h2>Create Voice</h2>
    <textarea v-model="content" placeholder="Say something..."></textarea>

    <button class="post" @click="postVoice">Post</button>

    <h2>Your Voices</h2>

    <p v-if="voices.length === 0">No voices yet</p>

    <div v-for="v in voices" :key="v.id" class="voice">
      <p v-if="v.type === 'text'">{{ v.content }}</p>
      <video
        v-else
        controls
        :src="v.content"
      ></video>

      <button @click="deleteVoice(v.id)">Delete</button>
    </div>
  </div>
</template>

<script>
import api from "../services/api";

export default {
  data() {
    return {
      content: "",
      voices: [],
      userId: localStorage.getItem("userId")
    };
  },

  async mounted() {
    await this.loadVoices();
  },

  methods: {
    async loadVoices() {
      const res = await api.get("/voices", {
        headers: { "x-user-id": this.userId }
      });
      this.voices = res.data;
    },

    async postVoice() {
      if (!this.content.trim()) return;

      const res = await api.post(
        "/voices",
        { type: "text", content: this.content },
        { headers: { "x-user-id": this.userId } }
      );

      this.voices.unshift(res.data);
      this.content = "";
    },

    async deleteVoice(id) {
      await api.delete(`/voices/${id}`, {
        headers: { "x-user-id": this.userId }
      });
      this.voices = this.voices.filter(v => v.id !== id);
    },

    logout() {
      localStorage.clear();
      this.$router.push("/login");
    }
  }
};
</script>

<style scoped>
.page {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}
textarea {
  width: 100%;
  height: 120px;
}
.post {
  margin-top: 10px;
}
.voice {
  border-top: 1px solid #ddd;
  padding: 10px 0;
}
.logout {
  float: right;
}
</style>


