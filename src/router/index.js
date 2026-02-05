import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue";
import VideoView from "@/views/VideoView.vue";
import SpeakView from "@/views/SpeakView.vue";
import WriteView from "@/views/WriteView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: Login },
    { path: "/register", component: Register },
    { path: "/dashboard", component: Dashboard, meta: { requiresAuth: true } },
    { path: "/speak", component: SpeakView, meta: { requiresAuth: true } },
    { path: "/write", component: WriteView, meta: { requiresAuth: true } },
    { path: "/video", component: VideoView, meta: { requiresAuth: true } },
    { path: "/", redirect: "/login" }
  ]
});

router.beforeEach((to, _, next) => {
  const token = localStorage.getItem("token");
  if (to.meta.requiresAuth && !token) next("/login");
  else next();
});

export default router;
