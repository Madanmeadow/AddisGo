import { createRouter, createWebHistory } from "vue-router";

// views
import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";

/**
 * Simple auth check
 * token is set after login
 */
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
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
 * Route guard
 */
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next("/login");
  } else if (to.path === "/login" && isAuthenticated()) {
    next("/dashboard");
  } else {
    next();
  }
});

export default router;




