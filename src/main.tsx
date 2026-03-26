import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Purge any remaining service workers and caches from previous PWA builds
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  caches.keys().then((names) => {
    names.forEach((n) => caches.delete(n));
  });
}

// Track build version
const BUILD_VERSION = __BUILD_TIMESTAMP__;
localStorage.setItem('app-build-version', BUILD_VERSION);

// Theme is applied in index.html <head> to prevent flash

createRoot(document.getElementById("root")!).render(<App />);
