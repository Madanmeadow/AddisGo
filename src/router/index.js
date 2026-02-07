import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: Login },
    { path: "/register", component: Register },
    {
      path: "/dashboard",
      component: Dashboard,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem("token")) {
    next("/login");
  } else {
    next();
  }
});

export default router;












