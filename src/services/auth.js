import api from "./api";

export const login = async (email, password) => {
  const res = await api.post("/login", { email, password });

  // save token + email
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("userEmail", email);

  return res.data;
};

export const register = async (email, password) => {
  const res = await api.post("/register", { email, password });

  // save token + email
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("userEmail", email);

  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
};
