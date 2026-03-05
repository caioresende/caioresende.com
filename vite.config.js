import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "migrant-wallet": resolve(__dirname, "migrant-wallet.html"),
        "canadian-tomorrow": resolve(__dirname, "canadian-tomorrow.html"),
        resume: resolve(__dirname, "resume.html"),
        comentto: resolve(__dirname, "comentto.html"),
        valence: resolve(__dirname, "valence.html"),
        portals: resolve(__dirname, "portals.html"),
        fifa: resolve(__dirname, "fifa.html"),
      },
      output: {
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
