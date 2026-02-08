<template>
  <div class="container">
    <div class="top">
      <h1>Dashboard</h1>
      <button class="logout" @click="logout">Logout</button>
    </div>

    <h2>Create Voice</h2>

    <!-- TEXT INPUT -->
    <textarea
      v-model="content"
      placeholder="Say something..."
    ></textarea>

    <!-- VIDEO INPUT (mobile camera) -->
    <input
      v-if="mode === 'video'"
      type="file"
      accept="video/*"
      capture="environment"
      @change="handleVideo"
    />

    <div class="actions">
      <select v-model="mode">
        <option value="text">Text</option>
        <option value="video">Video</option>
      </select>

      <button class="post" @click="postVoice">Post</button>
    </div>

    <h2>Your Voices</h2>

    <p v-if="voices.length === 0">No voices yet</p>

    <div v-for="v in voices" :key="v.id" class="voice">
      <p v-if="v.type === 'text'">{{ v.content }}</p>

      <video
        v-if="v.type === 'video'"
        controls
        playsinline
        :src="v.videoUrl"
      ></video>
    </div>
  </div>
</template>

<script>
import api from "../services/api";

export default {
  data() {
    return {
      content: "",
      mode: "text",
      videoFile: null,
      voices: []
    };
  },

  async mounted() {
    await this.loadVoices();
  },

  methods: {
    logout() {
      localStorage.clear();
      this.$router.push("/login");
    },

    handleVideo(e) {
      this.videoFile = e.target.files[0];
    },

    async postVoice() {
      const userId = localStorage.getItem("userId");
      if (!userId) return alert("Not logged in");

      try {
        let res;

        if (this.mode === "text") {
          if (!this.content.trim()) return;

          res = await api.post(
            "/voices",
            {
              type: "text",
              content: this.content
            },
            {
              headers: { "x-user-id": userId }
            }
          );
        }

        if (this.mode === "video") {
          if (!this.videoFile) return;

          const formData = new FormData();
          formData.append("video", this.videoFile);
          formData.append("type", "video");

          res = await api.post("/voices", formData, {
            headers: {
              "x-user-id": userId,
              "Content-Type": "multipart/form-data"
            }
          });
        }

        // 🔥 SHOW POST INSTANTLY
        this.voices.unshift(res.data);

        this.content = "";
        this.videoFile = null;
        this.mode = "text";
      } catch (err) {
        console.error(err);
        alert("Post failed");
      }
    },

    async loadVoices() {
      const userId = localStorage.getItem("userId");

      const res = await api.get("/voices", {
        headers: { "x-user-id": userId }
      });

      this.voices = res.data;
    }
  }
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: auto;
  padding: 16px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

textarea {
  width: 100%;
  height: 120px;
  padding: 10px;
  margin-top: 8px;
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.post {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
}

.voice {
  border-top: 1px solid #ddd;
  padding: 10px 0;
}

video {
  width: 100%;
  border-radius: 12px;
}
</style>



