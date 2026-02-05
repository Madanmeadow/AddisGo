import { createRouter, createWebHistory } from "vue-router";

import HomeView from "@/views/HomeView.vue";
import ExploreView from "@/views/ExploreView.vue";
import DashboardView from "@/views/DashboardView.vue";
import UploadView from "@/views/UploadView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/explore",
    name: "Explore",
    component: ExploreView,
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: DashboardView,
  },
  {
    path: "/upload",
    name: "Upload",
    component: UploadView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
