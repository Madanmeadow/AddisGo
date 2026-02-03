<template>
  <div class="dashboard">
    <h1 class="title">MeDan</h1>
    <p class="subtitle">
      MeDan is not a clone.<br />
      <strong>MeDan is a voice.</strong>
    </p>

    <h2 class="question">What do you want to speak about today?</h2>

    <!-- Actions -->
    <div class="actions">
      <button class="primary" @click="goSpeak">
        🎤 Speak now
      </button>

      <button class="secondary" @click="goWrite">
        ✍️ Write your voice
      </button>

      <button class="video" @click="goVideo">
        🎥 Record video
      </button>
    </div>

    <!-- Community -->
    <h2 class="section">Community Voices</h2>

    <div class="card">
      <h3>Why small businesses need better tech</h3>
      <p>Too many founders are locked out of modern tools…</p>
    </div>

    <div class="card">
      <h3>Immigrant voices in startups</h3>
      <p>Our stories don’t start with privilege, but with courage…</p>
    </div>

    <div class="card">
      <h3>Mental health in silence-driven cultures</h3>
      <p>Silence is not strength when it hides pain…</p>
    </div>

    <!-- Impact -->
    <h2 class="section">Your Impact</h2>
    <p class="impact">12 people heard your voice this week 💙</p>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goSpeak = () => {
  router.push("/speak");
};

const goWrite = () => {
  router.push("/write");
};

const goVideo = () => {
  router.push("/video");
};
</script>

<style scoped>
.dashboard {
  max-width: 900px;
  margin: auto;
  padding: 40px 20px;
  text-align: center;
}

.title {
  font-size: 42px;
  margin-bottom: 10px;
}

.subtitle {
  color: #555;
  margin-bottom: 30px;
}

.question {
  margin: 30px 0 20px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

button {
  padding: 14px 24px;
  font-size: 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
}

.primary {
  background: #3aaed8;
  color: white;
}

.secondary {
  background: #eaeaea;
}

.video {
  background: #6c5ce7;
  color: white;
}

.section {
  margin: 50px 0 20px;
}

.card {
  background: rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  padding: 20px;
  margin: 15px auto;
  max-width: 600px;
  text-align: left;
}

.impact {
  margin-top: 10px;
  font-size: 18px;
}
</style>
