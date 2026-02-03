import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    component: Login,
    meta: { guest: true },
  },
  {
    path: "/register",
    component: Register,
    meta: { guest: true },
  },
  {
    path: "/dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🔐 AUTH GUARD
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  // Not logged in → trying to access protected page
  if (to.meta.requiresAuth && !token) {
    next("/login");
  }
  // Logged in → trying to access login/register
  else if (to.meta.guest && token) {
    next("/dashboard");
  } else {
    next();
  }
});

export default router;
