import { createRouter, createWebHistory } from "vue-router";

import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Dashboard from "../views/Dashboard.vue";
import Messages from "../views/Messages.vue";
import Live from "../views/Live.vue";
import Call from "../views/Call.vue";
import RoomCall from "../views/RoomCall.vue"; // ✅ ADD THIS
import Watch from "../views/Watch.vue";
import Profile from "../views/Profile.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/dashboard", component: Dashboard },
  { path: "/messages", component: Messages },
  { path: "/live", component: Live },
  { path: "/watch/:id", name: "Watch", component: Watch },
  { path: "/profile/:id?", component: Profile },
  { path: "/call", component: Call }, // direct 1-to-1 call
  { path: "/room-call", component: RoomCall }, // ✅ group room call
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;









