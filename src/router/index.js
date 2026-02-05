import { createRouter, createWebHistory } from "vue-router";

// Views (make sure these files EXIST with exact names)
import HomeView from "@/views/HomeView.vue";
import ExploreView from "@/views/ExploreView.vue";
import UploadView from "@/views/UploadView.vue";
import DashboardView from "@/views/DashboardView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView
  },
  {
    path: "/explore",
    name: "Explore",
    component: ExploreView
  },
  {
    path: "/upload",
    name: "Upload",
    component: UploadView
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: DashboardView
  },
  // fallback
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
