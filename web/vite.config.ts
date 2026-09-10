import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Game Master orchestrator (Chapter 5) listens on port 8009 by default.
// In local development the browser talks to same-origin `/api/*` paths and Vite
// proxies them to the orchestrator, so no HTTPS tunnel is required. Override the
// target with GM_ORCHESTRATOR_URL if your orchestrator runs elsewhere.
const ORCHESTRATOR_URL = process.env.GM_ORCHESTRATOR_URL ?? "http://localhost:8009";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: ORCHESTRATOR_URL,
        changeOrigin: true,
        // Strip the `/api` prefix so `/api/health` -> `/health` on the orchestrator.
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
