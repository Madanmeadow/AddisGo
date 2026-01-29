<template>
  <div>
    <h1>Frontend is running</h1>
  </div>
</template>

<script>
import api from "@/services/api";

export default {
  name: "App",
  mounted() {
    api.get("/api/auth/test")
      .then(res => {
        console.log("API RESPONSE:", res.data);
      })
      .catch(err => {
        console.error("API ERROR:", err.message);
      });
  }
};
</script>
