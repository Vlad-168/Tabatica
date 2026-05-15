import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project is served from https://<user>.github.io/tabatica/ on GitHub Pages,
// so the production base must match the repo name. Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/tabatica/" : "/",
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
}));
