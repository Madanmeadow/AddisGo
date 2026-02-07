<script setup>
import Sidebar from "../components/dashboard/Sidebar.vue";
import TopBar from "../components/dashboard/TopBar.vue";
import DashboardFeed from "../components/dashboard/DashboardFeed.vue";
</script>

<template>
  <div class="dashboard-layout">
    <Sidebar />
    <div class="dashboard-main">
      <TopBar />
      <DashboardFeed />
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  background: #000;
  color: white;
}

.dashboard-main {
  flex: 1;
  overflow-y: auto;
}
</style>


