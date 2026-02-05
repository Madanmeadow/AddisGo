import { createRouter, createWebHistory } from "vue-router";

// Views
import HomeView from "@/views/HomeView.vue";
import ExploreView from "@/views/ExploreView.vue";
import UploadView from "@/views/UploadView.vue";

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
