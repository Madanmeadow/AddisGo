<template>
  <div class="dashboard">
    <header class="top">
      <h1>Dashboard</h1>
      <button @click="logout">Logout</button>
    </header>

    <!-- CREATE VOICE -->
    <section class="create">
      <h2>Create Voice</h2>

      <select v-model="type">
        <option value="text">Text</option>
        <option value="video">Video</option>
      </select>

      <textarea
        v-if="type === 'text'"
        v-model="text"
        placeholder="Say something..."
      ></textarea>

      <input
        v-if="type === 'video'"
        type="file"
        accept="video/*"
        capture="environment"
        @change="uploadVideo"
      />

      <button @click="postText" v-if="type === 'text'">
        Post
      </button>
    </section>

    <!-- VOICES -->
    <section class="voices">
      <h2>Your Voices</h2>

      <p v-if="voices.length === 0">No voices yet</p>

      <div
        v-for="voice in voices"
        :key="voice.id"
        class="voice"
      >
        <p v-if="voice.type === 'text'">{{ voice.content }}</p>

        <video
          v-if="voice.type === 'video'"
          :src="api + voice.content"
          controls
          playsinline
        ></video>

        <button @click="deleteVoice(voice.id)">
          Delete
        </button>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  data() {
    return {
      voices: [],
      text: "",
      type: "text",
      api: "https://addisgo-1.onrender.com"
    };
  },

  mounted() {
    this.fetchVoices();
  },

  methods: {
    authHeader() {
      return {
        Authorization: "Bearer " + localStorage.getItem("token")
      };
    },

    async fetchVoices() {
      const res = await fetch(this.api + "/api/voices", {
        headers: this.authHeader()
      });
      this.voices = await res.json();
    },

    async postText() {
      if (!this.text.trim()) return;

      await fetch(this.api + "/api/voices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeader()
        },
        body: JSON.stringify({
          type: "text",
          content: this.text
        })
      });

      this.text = "";
      this.fetchVoices();
    },

    async uploadVideo(e) {
      const file = e.target.files[0];
      if (!file) return;

      const form = new FormData();
      form.append("video", file);

      const upload = await fetch(this.api + "/api/video", {
        method: "POST",
        headers: this.authHeader(),
        body: form
      });

      const { videoUrl } = await upload.json();

      await fetch(this.api + "/api/voices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeader()
        },
        body: JSON.stringify({
          type: "video",
          content: videoUrl
        })
      });

      this.fetchVoices();
    },

    async deleteVoice(id) {
      await fetch(this.api + `/api/voices/${id}`, {
        method: "DELETE",
        headers: this.authHeader()
      });

      this.fetchVoices();
    },

    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    }
  }
};
</script>

<style scoped>
.dashboard {
  max-width: 700px;
  margin: auto;
  padding: 16px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create,
.voices {
  margin-top: 24px;
}

textarea {
  width: 100%;
  height: 80px;
  margin: 8px 0;
}

.voice {
  border-top: 1px solid #ddd;
  padding: 12px 0;
}

video {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
}

button {
  margin-top: 8px;
}
</style>

