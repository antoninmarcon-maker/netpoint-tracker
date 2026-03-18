import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

import { toast } from "sonner";

// Store build version — used to detect stale caches
const BUILD_VERSION = __BUILD_TIMESTAMP__;
const STORED_VERSION_KEY = 'app-build-version';
const storedVersion = localStorage.getItem(STORED_VERSION_KEY);

if (storedVersion && storedVersion !== BUILD_VERSION) {
  // New version detected — clear old caches and force reload
  localStorage.setItem(STORED_VERSION_KEY, BUILD_VERSION);
  caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).then(() => {
    window.location.reload();
  });
} else {
  localStorage.setItem(STORED_VERSION_KEY, BUILD_VERSION);
}

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
    toast.success("Application prête pour usage hors-ligne");
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check immediately on page load
      registration.update();
      // Then check every 60 seconds
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
    }
  },
});

// Apply saved theme immediately to avoid flash
const savedTheme = localStorage.getItem('theme') || 'dark';
const resolved = savedTheme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : savedTheme;
if (resolved === 'dark') document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
