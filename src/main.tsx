import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import i18n from "./i18n";

import { toast } from "sonner";

// Track build version (cache lifecycle is managed by the service worker)
const BUILD_VERSION = __BUILD_TIMESTAMP__;
localStorage.setItem('app-build-version', BUILD_VERSION);

// Force reload when a new service worker takes control
let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!refreshing) {
    refreshing = true;
    window.location.reload();
  }
});

// Register SW with autoUpdate strategy — updates apply silently
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-update: apply immediately, then reload
    updateSW(true);
  },
  onOfflineReady() {
    toast.success(i18n.t('pwa.offlineReady', 'App ready for offline use'));
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check immediately on page load
      registration.update();

      // Check every 60s while tab is visible
      setInterval(() => {
        if (!document.hidden) registration.update();
      }, 60 * 1000);

      // Check when app comes back to foreground (critical for mobile PWAs
      // where the process is suspended in background)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update();
      });
    }
  },
});

// Theme is applied in index.html <head> to prevent flash

createRoot(document.getElementById("root")!).render(<App />);
