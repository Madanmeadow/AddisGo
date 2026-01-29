import api from "./api";

export const register = (data) =>
  api.post("/api/auth/register", data);

export const login = async (data) => {
  const res = await api.post("/api/auth/login", data);
  localStorage.setItem("token", res.data.token);
  return res;
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};
