import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Auto-update SW: check every 15 minutes for a new version
registerSW({
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000);
    }
  },
  onOfflineReady() {},
});

// Apply saved theme immediately to avoid flash
const savedTheme = localStorage.getItem('theme') || 'dark';
const resolved = savedTheme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : savedTheme;
if (resolved === 'dark') document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
