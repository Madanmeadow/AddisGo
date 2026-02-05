<template>
  <component :is="navbarComponent" />
  <router-view />
</template>

<script>
import SiteNavbar from "@/components/SiteNavbar.vue";
import AppNavbar from "@/components/AppNavbar.vue";

export default {
  components: {
    SiteNavbar,
    AppNavbar
  },
  computed: {
    navbarComponent() {
      const authPages = ["/login", "/register"];
      if (authPages.includes(this.$route.path)) return null;

      return localStorage.getItem("token")
        ? "AppNavbar"
        : "SiteNavbar";
    }
  }
};
</script>
