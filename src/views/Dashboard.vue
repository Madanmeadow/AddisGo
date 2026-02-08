<template>
  <div class="container">
    <h1>Dashboard</h1>
    <button class="logout" @click="logout">Logout</button>

    <h2>Create Voice</h2>

    <select v-model="type">
      <option value="text">Text</option>
      <option value="video">Video</option>
    </select>

    <!-- TEXT -->
    <textarea
      v-if="type === 'text'"
      v-model="text"
      placeholder="Say something..."
    ></textarea>

    <!-- VIDEO -->
    <input
      v-if="type === 'video'"
      type="file"
      accept="video/*"
      capture="environment"
      @change="handleVideo"
    />

    <button class="post" @click="postVoice">Post</button>

    <h2>Your Voices</h2>
    <p v-if="myVoices.length === 0">No voices yet</p>

    <div v-for="v in myVoices" :key="v.id" class="voice">
      <p v-if="v.type === 'text'">{{ v.text }}</p>
      <video v-if="v.type === 'video'" controls :src="api + v.videoUrl"></video>
    </div>

    <hr />

    <h2>🌍 Public Feed</h2>

    <div
      v-for="v in publicVoices"
      :key="'p-' + v.id"
      class="voice public"
    >
      <p v-if="v.type === 'text'">{{ v.text }}</p>
      <video
        v-if="v.type === 'video'"
        controls
        playsinline
        :src="api + v.videoUrl"
      ></video>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      api: "https://addisgo-1.onrender.com",
      text: "",
      type: "text",
      videoFile: null,
      myVoices: [],
      publicVoices: []
    };
  },
  mounted() {
    this.loadVoices();
    this.loadPublic();
  },
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },
    handleVideo(e) {
      this.videoFile = e.target.files[0];
    },
    async postVoice() {
      const token = localStorage.getItem("token");
      const form = new FormData();

      form.append("type", this.type);
      if (this.type === "text") form.append("text", this.text);
      if (this.type === "video") form.append("video", this.videoFile);

      await fetch(this.api + "/api/voices", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      this.text = "";
      this.videoFile = null;
      this.loadVoices();
      this.loadPublic();
    },
    async loadVoices() {
      const token = localStorage.getItem("token");
      const res = await fetch(this.api + "/api/voices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.myVoices = await res.json();
    },
    async loadPublic() {
      const res = await fetch(this.api + "/api/voices/public");
      this.publicVoices = await res.json();
    }
  }
};
</script>

<style>
.container {
  max-width: 600px;
  margin: auto;
  font-family: system-ui;
}
textarea {
  width: 100%;
  height: 120px;
}
.voice {
  margin: 16px 0;
}
video {
  width: 100%;
  border-radius: 12px;
}
.public video {
  aspect-ratio: 9 / 16;
}
button {
  margin-top: 8px;
}
.logout {
  float: right;
}
</style>



