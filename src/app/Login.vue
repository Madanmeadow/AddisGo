<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()

const login = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (!error) router.push('/app')
  else alert(error.message)
}
</script>

<template>
  <div class="auth">
    <h1>Welcome back to MeDan</h1>

    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />

    <button @click="login">Login</button>

    <p>
      No account?
      <router-link to="/register">Create one</router-link>
    </p>
  </div>
</template>
