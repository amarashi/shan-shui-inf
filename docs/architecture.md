# Architecture

State at the end of Phase 2 (3 October 2026). The scene is still upstream's (mountains, trees, boats, pavilions), but the engine underneath is new: display lists, colour roles, chunk-local randomness, a bounded chunk cache, incremental DOM and a Web Worker. Phase 3 adds the coast.

## How a frame is made

```
seed ─► generator.chunk(k)  (pure in seed and k; runs in Node or the worker)
          plan.js     plan chunk k: mountains first, then flat islands and boats
          layers.js   draw each record from its own stream ─► display list
          svg.js      display list + palette ─► markup
             │
             ▼
page:  scroller.js   which chunks the view needs; ask the worker; evict far ones
       dom.js        one <g> per part, synced in paint order (only changes touch the DOM)
```

## Module map

| Module | Role | DOM? |
|--------|------|------|
| `src/rng.js` | `stream(...keys)` (pure-rand xoroshiro128+), `hash`, `random()` reading the stream set by `withRandom()` | no |
| `src/noise.js` | `createNoise(rand)`: 4-octave simplex (simplex-noise), calibrated to upstream's p5 noise; `Noise.noise()` reads the noise set by `withNoise()` | no |
| `src/geom.js` | upstream `PolyTools` and numeric utilities | no |
| `src/brush.js` | upstream `stroke`, `blob`, `div`, `texture` (texture takes a `role`) | no |
| `src/render/displaylist.js` | `poly()` and `text()` return records `{type, pts, fill, stroke, width}` | no |
| `src/render/palette.js` | colours `tone(role, a, rgb)`, `body(role)`, `NONE`, `CLEAR`; palettes `ink` (upstream's exact strings) and `roles` (diagnostic false colour) | no |
| `src/render/svg.js` | `toSVG(list, palette)` | no |
| `src/elements/flora.js` | upstream `Tree.tree01` to `tree08` | no |
| `src/elements/terrain.js` | upstream `Mount` (`mountain`, `flatMount`, `flatDec`, `distMount`, `rock`) | no |
| `src/elements/structures.js` | upstream `Arch` (no brand sign) | no |
| `src/elements/figures.js` | upstream `Man` | no |
| `src/elements/sea.js` | upstream `water` | no |
| `src/paper.js` | upstream's paper texture | no |
| `src/world/plan.js` | upstream's `mountplanner`, chunk-local and two-stage | no |
| `src/world/layers.js` | layer registry: `registerLayer({name, draw})` | no |
| `src/world/generator.js` | `createGenerator({seed, palette}).chunk(k)` returns parts with markup and display lists | no |
| `src/world/chunks.js` | view rules (`needs`, `inView`, `byDepth`, `viewBox`) and `createWorld()`, the synchronous world for Node | no |
| `src/render/dom.js` | `createPartView(g).sync(parts)` | yes |
| `src/embed/worker.js` | module Web Worker: chunks and paper on request | worker |
| `src/embed/scroller.js` | `createScroller({group, worker, seed})`: requests, eviction, DOM sync; `scrollBy()` resolves when the view is complete | yes |
| `compat/main.js`, `index.html` | upstream's UI on the engine; serve with `pnpm dev` | yes |

Runtime dependencies: `pure-rand`, `simplex-noise` (see `docs/decisions.md`).

## Randomness and order

Every chunk `k` is planned from `stream(seed, "mounts", k)` and `stream(seed, "extras", k)`, and every record `i` in it is drawn from `stream(seed, "draw", k, i)`. Noise is one table per world, from `stream(seed, "noise")`; it is a pure function of position. So chunk `k` depends only on `(seed, k)`: generation order, eviction and the worker make no difference. Ties in paint order break by `(y, k, i, part)`.

Upstream's flat islands depended on a shared coverage array filled in scroll order. `plan.js` computes coverage from the mountains of chunks `k-2` to `k+2` instead.

## Tests and checks

| Check | File or command | What it proves |
|-------|-----------------|----------------|
| Engine golden | `test/engine-golden.test.js` | Output has not changed (15 chunks and 3 views per seed). Re-record only after a reviewed change. |
| Order | `test/order.test.js` | Three generation orders give identical chunks; a view is the same however you scrolled to it. |
| Eviction | `test/eviction.test.js` | 200 scroll steps hold at most 20 chunks; an evicted chunk regenerates byte for byte. |
| Finite geometry | `test/no-nan.test.js` | No NaN or Infinity in any display list. |
| Roles | `test/palette.test.js` | Every colour has a known role; every palette paints a whole world. |
| No brands | `test/no-brands.test.js` | No text in the scene. |
| No DOM | `test/no-dom.test.js` | Generation modules name no DOM globals. |
| Worker thread | `test/worker.test.js` | A Node worker thread generates the same world. |
| Browser | `test/browser.test.js` | In Chromium with the Web Worker, the DOM equals the visible parts after scrolling, and the worker's output equals Node's. |
| Upstream itself | `pnpm golden:check`, `test/upstream.test.js` | `upstream/index.html` is unchanged and still gives the recorded hashes. |
| Visual | `pnpm sheet --source modules [--palette roles]` | Contact sheet for review. |

The specimen tool (`pnpm specimen <element>`) still draws upstream's elements from the upstream page. Phase 3 moves it onto the modules so new elements can be reviewed.

## Since Phase 2 (updated 3 October 2026)

- **Scenes** (`src/world/scenes/`): `upstream` (the original landscape) and `coast` (`coast.js` landscape layers, `coast-life.js` flora, structures, boats and people, `coast-registry.js` the layer registry and paint depths). The coast model is `src/world/coast.js`; view rules are `src/world/view.js`.
- **Coast elements** (`src/elements/`): `sea.js` (swell, surf, swash), `beach.js`, `headland.js` (headland, stacks), `sky.js`, `natives.js` (flora), `buildings.js` (structures and boats), `people.js` (figures).
- **Embedding** (`src/embed/`): `mount.js` (the `mount()` API), `element.js` (`<coast-inf>`), `scroller.js`, `worker.js`; `src/render/standalone.js` is `renderToSVG()`; `src/index.js` is the package entry.
- **Black and white.** Colour palettes were built in Phase 5 and reverted at Amir's request; roles remain on every colour, and `ink` (plus the diagnostic `roles`) are the palettes.
- **Tests** now also cover the coast scene (`coast.test.js`, `coast-scene.test.js`), embedding (`embed.test.js`), the built bundle from static files (`dist.test.js`), and both scenes in the engine golden master.
