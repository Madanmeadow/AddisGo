import { createRouter, createWebHistory } from "vue-router";

import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";
import Chat from "../views/Chat.vue";

const routes = [
  { path: "/login", component: Login },
  { path: "/dashboard", component: Dashboard },
  { path: "/chat", component: Chat }, // 👈 chat page
  { path: "/", redirect: "/login" }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;







