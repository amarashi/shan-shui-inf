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
