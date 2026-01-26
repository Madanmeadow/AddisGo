<script setup>
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div>
    <h1>MeDan</h1>
    <p>Voices, not noise.</p>

    <button @click="logout">Logout</button>
  </div>
</template>
