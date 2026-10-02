# Decisions

One entry per runtime or tooling dependency, and per decision that changes how the project works. Newest last.

## Dependencies

| Package | Version | Kind | Why |
|---------|---------|------|-----|
| vite | 8.3.2 | dev | Dev server for the demo and compatibility pages, and the library build later (Phase 6). |
| vitest | 5.0.3 | dev | Test runner that shares Vite's config and runs ES modules in Node without a build step. |
| playwright | 1.62.1 | dev | Drives Chromium to record the upstream golden master, run the upstream page for sheets, and measure performance. |
| sharp | 0.35.5 | dev | Rasterises SVG to PNG (it bundles librsvg) and tiles PNGs into contact and specimen sheets. |

No runtime dependencies so far.

## Notes

- **Playwright is pinned to 1.62, not the current 1.63.** On 2 October 2026 the Chromium download for 1.63 (build 1243) timed out repeatedly from this machine. 1.62 uses Chromium build 1234, which was already in the local Playwright cache. Move to the latest version when the download works; the golden hashes must be re-checked after any Chromium change (see PLAN.md, Phase 1, "Known limit").
- **The `playwright` library, not `@playwright/test`.** The tools are plain Node scripts and the tests run in Vitest, so the separate Playwright test runner is not needed.
- **Sheets are rasterised by Chromium, not by sharp's SVG renderer (librsvg).** Chromium is what visitors see, including the paper background and `mix-blend-mode: multiply`, and the upstream on-screen SVG is about 14 MB, which is slow to copy out of the page. sharp is used to scale, label and tile the screenshots. Pure-Node rasterising with sharp stays available for later if a browser-free path is needed.
- **Tools serve pages with a 30-line `node:http` static server, not Vite's dev server.** Vite injects its client script and can reload the page (for example after optimising dependencies), which made one sheet render time out. The golden check must see files exactly as they are on disk. Vite stays for `pnpm dev` and, later, the library build.
- **The compatibility page has no doctype, like upstream.** With a doctype the browser uses standards mode, where an inline `<svg>` gets descender space and `#BG` grows by a few pixels; screenshots then no longer line up with upstream's.
- **Golden comparisons in Node use normalised hashes.** Node 24 (V8 13.6) and Chromium 151 differ in the last bit of one full-precision number upstream prints (a sign's `rotate()` for seed `1234567890123`). `pnpm golden:check --source modules` compares the module build byte for byte in the same Chromium that recorded the golden master.
- **Colour roles live on colours, and white fills are `body(role)` (Phase 2 step 2).** A record's fill and stroke often play different parts, so each carries its own role. Upstream's white occlusion fills become the body of a material rather than a generic `occlude` role, so Phase 5 can wash each body in its own tint. `NONE` is an object, not `null`, because upstream's argument defaults treat `null` as "not given".

## Phase 2 step 3: chunk-local randomness, new generator and noise

| Package | Version | Kind | Why |
|---------|---------|------|-----|
| pure-rand | 8.4.2 | runtime | Seeded generator (`xoroshiro128plus`) and `uniformFloat64`. One stream per (seed, layer, chunk), so chunks generate in any order. MIT, maintained, tiny when tree-shaken. Replaces upstream's `Prng` (`s * s mod pq` in floating point, which loses precision above 2^53). |
| simplex-noise | 4.0.3 | runtime | Replaces upstream's p5.js noise, which is LGPL 2.1. MIT, takes our seeded generator. |

- **Noise is calibrated to p5's statistics** so upstream's thresholds keep their meaning (for example `noise ** 3 < 0.1` for tree placement and `noise - 0.55` for mountain peaks). From 200,000 samples: p5 noise has mean 0.472 and spread 0.12 to 0.14; a 4-octave simplex sum (p5's octave scheme) has mean 0 and spread 0.246, and changes about twice as fast over small distances. `src/noise.js` scales inputs by 0.42 (best fit of step sizes at distances 0.05, 0.2, 1 and 3) and maps the sum to mean 0.472, spread 0.125, clamped to [0, 1]. p5 mirrored negative inputs (`noise(-x) == noise(x)`); simplex does not, which removes a mirror symmetry around x = 0 in upstream worlds.
- **The string hash for stream keys is 15 lines of our own (cyrb53, truncated to 32 bits),** not a package: it only turns keys such as `("coast", "draw", 3, 7)` into a generator seed, and pure-rand has no string hashing.
- **`random()` and `Noise.noise()` read a current source set with `withRandom()` and `withNoise()`.** Element code (about 3,000 lines from upstream) stays unchanged. Generation is synchronous, so several worlds on one page cannot interfere.
- **The compatibility page uses an import map** for the two packages, so it runs from plain static files and under Vite alike.

## Phase 2 steps 6 and 7: incremental DOM and the worker

- **One `<g>` per drawn part, not per chunk.** Paint order interleaves parts of different chunks, so per-chunk groups could not keep the order. A view holds about 50 to 100 parts.
- **The worker sends markup, not display lists.** Copying tens of thousands of point arrays between threads would cost more than it saves. Lists stay available in Node (`createWorld`) for later back ends.
- **The paper texture is drawn in the worker too** and sent as one transferred pixel buffer.
- **Tools serve pages with Vite again, configured not to reload** (`hmr: false`, `optimizeDeps.noDiscovery`). Workers do not use the page's import map, so plain static files cannot load the worker's package imports. This replaces the `node:http` server from Phase 1 and the import map in `index.html`.
- **Measured on 3 October 2026** (seeds 1, 42, coast): the longest main-thread task while loading fell from 0.56 to 0.88 s (upstream, desktop) to 0 to 0.1 s, and from 2.6 to 4.2 s to 0.07 to 0.29 s under 4x CPU throttling, where the first screen now completes in 0.65 to 1.4 s instead of 3.3 to 5.0 s. What remains on the main thread is inserting markup. (The new engine draws different worlds for a seed, so this is a like-for-like comparison only roughly.)

## Phase 3

- **`Noise.z()` for shapes.** The calibrated noise (like upstream's) varies only about +-0.12 around 0.47, so `k * Noise.noise()` barely moves; new coast code uses `Noise.z()`, the same noise standardised to mean 0 and spread 1. Upstream elements keep `Noise.noise()`.
- **Coast layers are drawn in pieces on a global lattice** (64 or 128 units, jittered by a hash of the piece index), and a piece or a surf run is drawn whole by the chunk where it starts. Shapes then never break or taper at chunk edges.

## Phase 6: embedding

- **Shadow DOM per mount, with `isolation: isolate`.** Styles cannot leak in or out, and the SVG's `mix-blend-mode: multiply` blends only with the painting's own paper, never with the host page behind it.
- **One worker per mount.** Simplest way to keep instances independent; each worker is small (27 kB gzipped) and idle once its view is drawn.
- **The page side imports only `src/world/view.js`** (view rules and per-scene view settings), so the generator ships only in the worker.
- **Library build uses `base: "./"`.** Otherwise Vite emits the worker URL as a root-absolute path and the painting never loads when the bundle is hosted in a sub-folder.
- **`"private": true` stays in package.json** until Amir decides to publish (Checkpoint 4).
- **No Canvas 2D backend (D7).** The SVG path meets the element and time budgets.
