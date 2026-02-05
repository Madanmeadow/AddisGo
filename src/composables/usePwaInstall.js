import { ref, onMounted } from "vue";

export function usePwaInstall() {
  const deferredPrompt = ref(null);
  const canInstall = ref(false);

  onMounted(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt.value = e;
      canInstall.value = true;
    });
  });

  const installApp = async () => {
    if (!deferredPrompt.value) return;

    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;

    if (outcome === "accepted") {
      deferredPrompt.value = null;
      canInstall.value = false;
    }
  };

  return {
    canInstall,
    installApp
  };
}
