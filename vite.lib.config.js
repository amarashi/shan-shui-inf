// Library build: pnpm build -> dist/coast-inf.js, dist/element.js and the worker chunk.
// The two runtime packages (pure-rand, simplex-noise) are bundled in, so the output runs
// from any static host without a bundler.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  // relative asset URLs: the worker is found next to the bundle wherever it is hosted
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    minify: true,
    lib: {
      entry: {
        "coast-inf": fileURLToPath(new URL("src/index.js", import.meta.url)),
        element: fileURLToPath(new URL("src/embed/element.js", import.meta.url)),
      },
      formats: ["es"],
    },
  },
  worker: { format: "es" },
});
