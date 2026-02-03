import { createRouter, createWebHistory } from "vue-router";

// Views
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Dashboard from "../views/Dashboard.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },

  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { guest: true },
  },

  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { guest: true },
  },

  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 🔐 GLOBAL AUTH GUARD
 */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;

  // If route requires auth and user is NOT logged in
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next("/login");
  }

  // If route is guest-only and user IS logged in
  if (to.meta.guest && isAuthenticated) {
    return next("/dashboard");
  }

  next();
});

export default router;

