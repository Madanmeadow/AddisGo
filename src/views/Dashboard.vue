<template>
  <Layout>
    <div class="feed">

      <!-- CREATE POST -->
      <div class="create-box">
        <textarea v-model="content" placeholder="What's happening?" />
        <div class="actions">
          <input type="file" @change="handleFile" />
          <button @click="submitPost">
            Post 🚀
          </button>
        </div>
      </div>

      <!-- POSTS -->
      <div v-for="post in posts" :key="post.id" class="post">

        <div class="header">
          <div class="avatar">
            {{ post.name?.charAt(0) }}
          </div>
          <div>
            <div class="name">{{ post.name }}</div>
            <div class="date">
              {{ new Date(post.created_at).toLocaleString() }}
            </div>
          </div>
        </div>

        <div v-if="post.caption" class="caption">
          {{ post.caption }}
        </div>

        <img
          v-if="post.image_url"
          :src="apiUrl + post.image_url"
          class="media"
        />

        <video
          v-if="post.video_url"
          controls
          :src="apiUrl + post.video_url"
          class="media"
        ></video>

      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Layout from "../components/Layout.vue";

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const posts = ref([]);
const content = ref("");
const file = ref(null);

async function fetchPosts() {
  const res = await fetch(`${apiUrl}/posts`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  posts.value = await res.json();
}

async function submitPost() {
  const formData = new FormData();
  formData.append("content", content.value);
  if (file.value) formData.append("file", file.value);

  await fetch(`${apiUrl}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  content.value = "";
  file.value = null;
  fetchPosts();
}

function handleFile(e) {
  file.value = e.target.files[0];
}

onMounted(fetchPosts);
</script>

<style scoped>
.feed {
  max-width: 700px;
  margin: auto;
  padding: 30px;
}

.create-box {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 25px;
}

textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  resize: none;
  border: none;
  margin-bottom: 12px;
}

button {
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 10px;
}

.post {
  background: rgba(0,0,0,0.6);
  padding: 18px;
  border-radius: 18px;
  margin-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 45px;
  height: 45px;
  background: #ff4b2b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  color: white;
  font-weight: bold;
}

.media {
  width: 100%;
  max-height: 500px;
  object-fit: cover;
  border-radius: 15px;
  margin-top: 12px;
}
</style>