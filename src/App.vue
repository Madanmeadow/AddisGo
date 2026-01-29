import api from "@/services/api";

export default {
  name: "TestAPI",
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
