<script>
import api from "../services/api";

export default {
  data() {
    return {
      voices: []
    };
  },
  async mounted() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await api.get("/voices", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    this.voices = res.data;
  }
};
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <button @click="logout">Logout</button>

    <div v-if="voices.length === 0">
      No voices yet
    </div>

    <ul>
      <li v-for="v in voices" :key="v.id">
        {{ v.type }} — {{ v.content }}
      </li>
    </ul>
  </div>
</template>

