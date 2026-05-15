import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves a project site under the (case-sensitive) repo name.
// A relative base makes every asset path work regardless of the path/case
// the app is served from. Dev server stays absolute at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
}));
