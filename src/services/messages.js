import api from "./api";

export const getMessages = (id) =>
  api.get(`/messages/${id}`);

export const sendMessage = (conversationId, text) =>
  api.post("/messages", { conversationId, text });
