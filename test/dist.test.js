// The built library works from plain static files, as on an ordinary website: no bundler,
// no dev server, the bundle in a sub-folder. (This caught the worker being requested from
// the site root instead of next to the bundle.)
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, expect, test } from "vitest";
import { launch } from "../tools/lib/upstream.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<coast-inf seed="static-host" mode="static" height="300"></coast-inf>
<script type="module" src="/site/sub/dist/element.js"></script>`;

let server;
let browser;
beforeAll(async () => {
  await build({ configFile: join(ROOT, "vite.lib.config.js"), logLevel: "silent" });
  // serve dist/ under a sub-folder, the way a website might host it
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/site/index.html") return res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
    if (!path.startsWith("/site/sub/dist/")) return res.writeHead(404).end();
    try {
      const body = await readFile(join(ROOT, "dist", path.slice("/site/sub/dist/".length)));
      res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await launch();
}, 120000);
afterAll(async () => {
  await browser?.close();
  server?.closeAllConnections?.();
  server?.close();
});

test("dist/element.js paints from a plain static host", async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 320 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/site/index.html`);
  await page.waitForFunction(() => document.querySelector("coast-inf")?.scene);
  await page.evaluate(() => document.querySelector("coast-inf").scene.ready);
  const parts = await page.evaluate(() => document.querySelector("coast-inf > div").shadowRoot.querySelectorAll("g > g").length);
  expect(errors).toEqual([]);
  expect(parts).toBeGreaterThan(20);
  await page.close();
});
