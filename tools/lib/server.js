// Serve the repository with Vite so pages that load ES modules, npm packages and a module
// Web Worker (the compatibility page at /index.html) can be opened in Playwright.
//
// Configured so nothing can reload a page under a tool: no hot module replacement, and no
// dependency pre-bundling (whose discovery step can trigger a full reload). The two
// runtime packages are plain ES modules, so they need no pre-bundling.
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

/** Start a server on a free port. Returns { url, close }. */
export async function startServer() {
  const server = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    logLevel: "error",
    clearScreen: false,
    server: { port: 0, host: "127.0.0.1", hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  await server.listen();
  return { url: server.resolvedUrls.local[0], close: () => server.close() };
}
