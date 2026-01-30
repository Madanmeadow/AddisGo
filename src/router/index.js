import { createRouter, createWebHistory } from "vue-router";
import Login from "@/views/Login.vue";

const routes = [
  { path: "/login", component: Login }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
