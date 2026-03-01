import { reactive } from "vue";

const state = reactive({ items: [] });

export function useToast(){
  const show = (msg, type="info", ms=2200) => {
    const id = Date.now() + Math.random();
    state.items.push({ id, msg, type });
    setTimeout(()=> state.items = state.items.filter(x=>x.id!==id), ms);
  };
  return { toastState: state, show };
}