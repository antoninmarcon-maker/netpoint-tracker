import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-dom")) return "vendor-react";
          if (id.includes("react-router-dom")) return "vendor-react";
          if (
            id.includes("/react/") ||
            id.includes("/react-jsx-runtime/") ||
            id.includes("/scheduler/")
          )
            return "vendor-react";

          if (id.includes("@supabase")) return "vendor-supabase";

          if (id.includes("@radix-ui")) return "vendor-radix";

          if (id.includes("recharts") || id.includes("d3-"))
            return "vendor-recharts";

          if (id.includes("leaflet")) return "vendor-leaflet";

          if (id.includes("i18next") || id.includes("i18next-browser"))
            return "vendor-i18n";

          if (
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("/clsx/") ||
            id.includes("tailwind-merge") ||
            id.includes("sonner")
          )
            return "vendor-ui";
        },
      },
    },
  },
});
