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
