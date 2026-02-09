import { createRouter, createWebHistory } from "vue-router";
import Register from "@/views/Register.vue";
import Login from "@/views/Login.vue";
import Dashboard from "@/views/Dashboard.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/register", component: Register },
    { path: "/login", component: Login },
    { path: "/dashboard", component: Dashboard },
    { path: "/", redirect: "/login" }
  ]
});












