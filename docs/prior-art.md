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

## Phase 2: generator and noise (searched 3 October 2026)

| Package | Licence | Weekly downloads | Decision |
|---------|---------|-----------------:|----------|
| pure-rand 8.4.2 | MIT | about 98 million | **Used**: seedable xoroshiro128+, float distribution, ES modules. |
| seedrandom 3.0.5 | MIT | about 11 million | Not used: last release 2022, larger, and it has an option that replaces `Math.random`. |
| alea 1.0.1 | MIT | small | Not used: unmaintained since 2022. |
| simplex-noise 4.0.3 | MIT | about 425,000 | **Used**: 2D/3D/4D simplex, accepts a seeded generator, ES modules. |
| open-simplex-noise 3.0.0 | Unlicense | small | Not used: less established; simplex-noise is enough. |
| fast-simplex-noise 4.0.0 | Unlicense | small | Not used: unmaintained since 2022. |

## Phase 3: coastal composition (searched 3 October 2026)

GitHub repository searches: "coastline generator", "seascape generative", "procedural waves", "eucalyptus procedural", "pen plotter ocean", "shanshui", "generative landscape svg", "watercolor generative" (longer phrases such as "procedural coastline svg" returned nothing).

| Project | Licence | Relevance | Decision |
|---------|---------|-----------|----------|
| ateliersvg/field | MIT | Procedural SVG waves, dunes and mountains (PHP) | Reference for wave strokes; nothing to copy (different language and look). |
| pearmini/mountains-trees-names-inf | MIT | Another infinite shan shui variant | Reference only; still Chinese landscape, no coast. |
| MushroomFleet/SVG_ShanShui-cli | MIT | Python port of upstream | Not needed. |
| amitp/mapgen2, PolyMapGenerator and similar | various | Top-down island and map generators | Not relevant: map view, not a painted side view. |
| axelinternet/p5-watercolor, 32bitkid/watercolorizer, freethejazz/generative-watercolor | none found | Tyler Hobbs' layered watercolour technique | Reference only (no licence); relevant to Phase 5 washes. |
| Token-Gremlin/natural-disasters | MIT | WebGL ocean simulation | Not relevant: 3D shading, not brushwork. |

No coastal or non-Chinese adaptation of {Shan, Shui}* was found, and no eucalyptus generator. Decision: the coast model, sea, surf, swash, beach and headland are bespoke art code built from upstream's brush primitives (`stroke`, `blob`, `texture`), as the plan's risk section asks. Generic needs stay with established packages (noise, generator).
