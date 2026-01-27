<template>
  <div class="page">
    <h2>Inbox</h2>

    <article v-for="r in responses" :key="r.id">
      <p>{{ r.body }}</p>
      <small>— {{ r.from.name }}</small>
    </article>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const responses = ref([]);

onMounted(async () => {
  const res = await api.getInbox();
  responses.value = res.responses;
});
</script>
