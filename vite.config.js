import { defineConfig } from "vite";
import { resolve } from "path";
import passwordGate, { config as gateConfig } from "./middleware.ts";

// Run the Vercel Routing Middleware (password gate) in `vite dev` and `vite preview` too
function vercelMiddleware() {
  const matches = (path) =>
    gateConfig.matcher.some((pattern) =>
      pattern.endsWith("/:path*")
        ? path.startsWith(pattern.slice(0, -"/:path*".length) + "/")
        : path === pattern
    );

  const handle = async (req, res, next) => {
    if (!matches(req.url.split("?")[0])) return next();

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = Object.entries(req.headers).filter(([key]) => !key.startsWith(":"));
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: headers.map(([key, value]) => [key, String(value)]),
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });

    const response = await passwordGate(request);
    if (!response) return next();
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  };

  return {
    name: "vercel-middleware",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  plugins: [vercelMiddleware()],
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
        rogers: resolve(__dirname, "rogers.html"),
        clio: resolve(__dirname, "clio.html"),
      },
      output: {
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
