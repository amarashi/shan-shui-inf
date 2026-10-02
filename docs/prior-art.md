# Prior art

What was searched for before building each generator or tool, what was found, and what was decided. Only code under a compatible licence may be copied; no licence file means reference only.

## Ports of {Shan, Shui}* (from PLAN.md, searched 2 October 2026)

| Project | Licence | Use |
|---------|---------|-----|
| zverok, "Grokking Shan Shui" blog series | blog | Reading: walkthrough of how upstream works. |
| RedContritio/shan_shui_inf (TypeScript and React, visual catalogue of components) | none found | Reference only. |
| zautumnz/shanshui-cli (npm `shanshui-cli`) | MIT | Shows headless generation in Node works. |
| dheera/shan-shui-inf (Node, e-ink display) | check before use | Reference. |
| NiklasNeugebauer/shanshui-screensaver (Rust) | keeps the noise file under LGPL | Supports the licence note on `Noise`. |

Still to do before Phase 3: search for coastal or non-Chinese adaptations (procedural coastline svg, generative waves javascript, procedural eucalyptus tree, plotter seascape).

## Phase 0 review tools

- **Golden master, contact sheet, specimen sheet.** These are thin scripts around established packages: Playwright drives the page, the browser's Web Crypto computes SHA-256, and sharp scales and tiles images. No dedicated contact-sheet package was worth a dependency; tiling is one `sharp().composite()` call.
- **Specimen sheet** follows upstream's own `dummyloader` (one element repeated along x). Ours reseeds per cell and draws each cell in a nested `<svg>` with its own viewBox, so small items are zoomed and large ones are clipped.
