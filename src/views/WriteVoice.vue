<template>
  <div class="page">
    <textarea
      v-model="body"
      placeholder="Say what matters. It doesn’t need to be polished."
    />

    <button @click="publish" :disabled="body.length < 20">
      Publish Voice
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../api';
import { useRouter } from 'vue-router';

const router = useRouter();
const body = ref('');

async function publish() {
  await api.createVoice({
    body: body.value,
    presence: 'writing'
  });

  router.push('/profile');
}
</script>
