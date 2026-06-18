import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://annoiiyed.github.io/solve.horse/ in production, so assets
// need the repo-name base. Dev stays at "/" so the local server is unaffected.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/solve.horse/" : "/",
  plugins: [react()],
}));
