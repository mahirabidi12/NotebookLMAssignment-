import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // dev only — proxies /api to local backend
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
