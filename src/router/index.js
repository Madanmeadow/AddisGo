import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", component: () => import("../views/Login.vue") },
    { path: "/dashboard", component: () => import("../views/Dashboard.vue") },
    { path: "/chat", component: () => import("../views/Chat.vue") }
  ]
});








