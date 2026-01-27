<template>
  <div class="page">
    <h2>Your voice</h2>

    <input
      v-model="name"
      placeholder="Your name"
    />

    <input
      v-model="handle"
      placeholder="Handle (optional)"
    />

    <textarea
      v-model="voiceTag"
      placeholder="What do you want to be understood for?"
    />

    <select v-model="presence">
      <option value="listening">Listening</option>
      <option value="writing">Writing</option>
      <option value="reflecting">Reflecting</option>
      <option value="away">Away</option>
    </select>

    <button @click="complete">
      Continue
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../api';
import { useRouter } from 'vue-router';

const router = useRouter();

const name = ref('');
const handle = ref('');
const voiceTag = ref('');
const presence = ref('listening');

async function complete() {
  await api.completeOnboarding({
    name: name.value,
    handle: handle.value,
    voice_tag: voiceTag.value,
    presence: presence.value
  });

  router.push('/profile');
}
</script>
