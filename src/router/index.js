import { createRouter, createWebHistory } from "vue-router";

import HomeView from "@/views/HomeView.vue";
import ExploreView from "@/views/ExploreView.vue";

const routes = [
  { path: "/", name: "Home", component: HomeView },
  { path: "/explore", name: "Explore", component: ExploreView }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;

