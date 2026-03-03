import { defineConfig } from "vite";

export default defineConfig({
  build: {
    copyPublicDir: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
