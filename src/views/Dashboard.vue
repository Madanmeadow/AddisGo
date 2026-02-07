<template>
  <div>
    <h1>Dashboard</h1>

    <button @click="logout">Logout</button>

    <h3>Create Voice</h3>

    <select v-model="type">
      <option value="text">Text</option>
      <option value="video">Video</option>
    </select>

    <textarea
      v-if="type === 'text'"
      v-model="content"
      placeholder="Write your voice..."
    />

    <input
      v-if="type === 'video'"
      v-model="content"
      placeholder="Paste video URL (YouTube, TikTok, etc)"
    />

    <button @click="createVoice">Post</button>

    <hr />

    <p v-if="voices.length === 0">No voices yet</p>

    <div v-for="voice in voices" :key="voice.id">
      <p v-if="voice.type === 'text'">
        📝 {{ voice.content }}
      </p>

      <a
        v-if="voice.type === 'video'"
        :href="voice.content"
        target="_blank"
      >
        🎥 {{ voice.content }}
      </a>

      <button @click="deleteVoice(voice.id)">Delete</button>
      <hr />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      voices: [],
      type: "text",
      content: ""
    };
  },
  async mounted() {
    this.fetchVoices();
  },
  methods: {
    async fetchVoices() {
      const res = await fetch(
        "https://addisgo-1.onrender.com/api/voices",
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
          }
        }
      );
      this.voices = await res.json();
    },

    async createVoice() {
      if (!this.content) return;

      await fetch("https://addisgo-1.onrender.com/api/voices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          type: this.type,
          content: this.content
        })
      });

      this.content = "";
      this.fetchVoices();
    },

    async deleteVoice(id) {
      await fetch(
        `https://addisgo-1.onrender.com/api/voices/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
          }
        }
      );
      this.fetchVoices();
    },

    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  }
};
</script>


