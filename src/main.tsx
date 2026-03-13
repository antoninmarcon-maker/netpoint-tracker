import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

import { toast } from "sonner";

// Register SW with prompt strategy
const updateSW = registerSW({
  onNeedRefresh() {
    toast("Une mise à jour est disponible", {
      description: "L'application doit être rafraîchie pour appliquer les derniers changements.",
      action: {
        label: "Mettre à jour",
        onClick: () => updateSW(true),
      },
      duration: Infinity,
    });
  },
  onOfflineReady() {
    toast.success("Application prête pour usage hors-ligne");
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000);
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
