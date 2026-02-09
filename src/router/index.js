import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";

const routes = [
  { path: "/login", component: Login },
  { path: "/register", component: Register },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});












