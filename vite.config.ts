import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
  test: {
    globals: true,
    environment: "node",
  },
});
