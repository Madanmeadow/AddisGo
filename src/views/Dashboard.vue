<template>
  <div>
    <h1>Dashboard</h1>

    <p v-if="user">
      Welcome, <strong>{{ user.name }}</strong> 👋
    </p>

    <p v-else>Loading user...</p>

    <button @click="logout">Logout</button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const auth = useAuthStore();
const router = useRouter();

const user = computed(() => auth.user);

const logout = () => {
  auth.logout();
  router.push("/login");
};
</script>



