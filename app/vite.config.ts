import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    port: 5179
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  test: {
    environment: "node"
  }
});
