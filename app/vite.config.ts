import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    port: 5179,
    watch: {
      // Cargo writes Rust build artifacts under src-tauri/target in
      // parallel; watching them crashes vite on Windows with EBUSY when a
      // file is locked mid-compile. Follows the official Tauri template.
      ignored: ["**/src-tauri/**"]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  test: {
    environment: "node"
  }
});
