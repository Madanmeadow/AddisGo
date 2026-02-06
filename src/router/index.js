import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";

function isAuthenticated() {
  return !!localStorage.getItem("token");
}

const routes = [
  { path: "/", redirect: "/dashboard" },
  { path: "/login", component: Login },
  {
    path: "/dashboard",
    component: Dashboard,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next("/login");
  } else {
    next();
  }
});

export default router;





