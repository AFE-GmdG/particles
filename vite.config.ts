import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  build: {
    target: ["es2024"],
    modulePreload: {
      polyfill: false,
    },
    sourcemap: command === "serve",
  },

  esbuild: {
    sourcemap: "inline",
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 2122,
    strictPort: true,
    open: false,
    cors: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  clearScreen: true,

  plugins: [],
}));
