import { createRouter, createWebHistory } from "vue-router";

// Public pages
import HomeView from "@/views/HomeView.vue";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";

// Protected pages
import Dashboard from "@/views/Dashboard.vue";
import VideoView from "@/views/VideoView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView
  },
  {
    path: "/login",
    name: "Login",
    component: Login
  },
  {
    path: "/register",
    name: "Register",
    component: Register
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: "/video/:id",
    name: "Video",
    component: VideoView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 🔐 Auth guard (optional but recommended)
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem("token");

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else {
    next();
  }
});

export default router;

