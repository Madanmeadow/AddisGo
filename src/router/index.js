import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue";

const routes = [
  {
    path: "/",
    redirect: "/login"
  },
  {
    path: "/login",
    component: Login
  },
  {
    path: "/register",
    component: Register
  },
  {
    path: "/dashboard",
    component: Dashboard,
    beforeEnter: (to, from, next) => {
      const token = localStorage.getItem("token");
      if (!token) {
        next("/login");
      } else {
        next();
      }
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;












