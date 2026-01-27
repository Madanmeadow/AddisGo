<template>
  <div class="page">
    <h1>Welcome to MeDan</h1>

    <input
      v-model="email"
      placeholder="Your email"
      type="email"
    />

    <input
      v-model="inviteToken"
      placeholder="Invite code"
    />

    <button @click="submit" :disabled="sent">
      Request access
    </button>

    <p v-if="sent">Check your email.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../api';

const email = ref('');
const inviteToken = ref('');
const sent = ref(false);

async function submit() {
  await api.requestMagicLink(email.value, inviteToken.value);
  sent.value = true;
}
</script>
