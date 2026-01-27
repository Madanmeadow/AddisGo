<template>
  <div class="page" v-if="profile">
    <h2>{{ profile.name }}</h2>
    <p>{{ profile.voice_tag }}</p>

    <section>
      <article v-for="v in voices" :key="v.id">
        <p>{{ v.body }}</p>
        <small>{{ new Date(v.created_at).toLocaleString() }}</small>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { useUserStore } from '../stores/userStore';

const store = useUserStore();
const profile = ref(null);
const voices = ref([]);

onMounted(async () => {
  const res = await api.getProfile(store.user.id);
  profile.value = res.user;
  voices.value = res.voices;
});
</script>
