import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue";
import VideoView from "@/views/VideoView.vue";

// simple placeholder views (can replace later)
const SpeakView = { template: "<div style='padding:40px'>🎤 Speak page coming next</div>" };
const WriteView = { template: "<div style='padding:40px'>✍️ Write page coming next</div>" };

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: Login,
    },
    {
      path: "/register",
      name: "Register",
      component: Register,
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    {
      path: "/speak",
      name: "Speak",
      component: SpeakView,
      meta: { requiresAuth: true },
    },
    {
      path: "/write",
      name: "Write",
      component: WriteView,
      meta: { requiresAuth: true },
    },
    {
      path: "/video",
      name: "Video",
      component: VideoView,
      meta: { requiresAuth: true },
    },
    {
      path: "/",
      redirect: "/login",
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  if (to.meta.requiresAuth && !token) {
    next("/login");
  } else {
    next();
  }
});

export default router;
