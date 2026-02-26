import { reactive } from "vue";

const state = reactive({
  items: [],
});

function push(type, message, timeout = 3500) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.items.push({ id, type, message });

  if (timeout > 0) {
    setTimeout(() => {
      state.items = state.items.filter((t) => t.id !== id);
    }, timeout);
  }
  return id;
}

export const toast = {
  state,
  success: (m) => push("success", m),
  error: (m) => push("error", m, 5000),
  info: (m) => push("info", m),
  dismiss: (id) => (state.items = state.items.filter((t) => t.id !== id)),
};