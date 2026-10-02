# Architecture

State at the end of Phase 1 (3 October 2026). The code in `src/` is upstream {Shan, Shui}* split into ES modules with no change in output. Phase 2 reshapes it towards the target layout in PLAN.md section 4.

## Module map

Arrows point from a module to what it imports.

```
compat/main.js ──► world/upstream.js ──► elements/terrain.js ──► elements/flora.js
      │                  │                      │                       │
      │                  │                      └──► elements/structures.js ──► elements/figures.js
      │                  ├──► elements/sea.js                                   │
      │                  └──► (structures, geom, noise, rng)                    │
      ├──► paper.js                                                             │
      └──► rng.js            every element module ──► brush.js ──► render/svg.js
                                                  ──► geom.js
                                                  ──► noise.js ──► rng.js
```

There are no import cycles. `rng.js` and `render/svg.js` import nothing.

| Module | Lines | Exports | Upstream source (lines of `upstream/index.html`) |
|--------|------:|---------|----------------|
| `src/rng.js` | 48 | `seed`, `random` (= `next`), `hash` | `Prng` (1 to 60), hand-ported |
| `src/noise.js` | 124 | `Noise` (`noise`, `noiseDetail`, `noiseSeed`, `reset`) | `PerlinNoise` (88 to 204); LGPL 2.1 origin, kept separate |
| `src/geom.js` | 277 | `PolyTools` (`midPt`, `triangulate`), `unNan`, `distance`, `mapval`, `loopNoise`, `randChoice`, `normRand`, `wtrand`, `randGaussian`, `bezmh` | `PolyTools`, `Util` (206 to 483) |
| `src/render/svg.js` | 28 | `poly` | `Util` (485 to 510) |
| `src/brush.js` | 232 | `stroke`, `blob`, `div`, `texture` | 516 to 741 |
| `src/elements/flora.js` | 990 | `Tree` (`tree01` to `tree08`) | 743 to 1725 |
| `src/elements/terrain.js` | 806 | `Mount` (`mountain`, `flatMount`, `flatDec`, `distMount`, `rock`) | 1727 to 2523 |
| `src/elements/structures.js` | 806 | `Arch` (`arch01` to `arch04`, `boat01`, `transmissionTower01`) | 2525 to 3322 |
| `src/elements/figures.js` | 349 | `Man` (`man`, `hat01`, `hat02`, `stick01`) | 3324 to 3665 |
| `src/elements/sea.js` | 43 | `water` | 3667 to 3704 |
| `src/world/upstream.js` | 283 | `createWorld()` returning `{ MEM, update, xcroll, calcViewBox }` | `MEM`, `mountplanner`, `chunkloader`, `chunkrender`, `update`, `xcroll`, `calcViewBox` (3706 to 4040) |
| `src/paper.js` | 30 | `paperTexture(fillPixel)` | last script (4336 to 4361) |
| `compat/main.js` | 146 | none (page script) | seed parsing, UI, page load order |

`index.html` is the compatibility page: upstream's markup, loading `compat/main.js`. It has no doctype on purpose (see `docs/decisions.md`).

## What changed from upstream, and what did not

Changed (none of it changes output):

- Exports and imports instead of globals. `Tree`, `Mount`, `Arch`, `Man` and `Noise` keep upstream's `new function() {...}` object form for now.
- Implicit globals are declared: `vtxlist0`, `vtxlist1`, `vtxlist` in `stroke` and `Man`'s `expand`; `reso` in `tree01`, `tree03`, `tree07`; `MEM` is per world.
- `random()` from `rng.js` replaces the patched `Math.random`, call for call. Nothing patches `Math`.
- `this.flatDec` became `Mount.flatDec` (same object). `Noise.reset()` was added so a test can start from a fresh table, as a new page does.
- Console logging was removed; `dummyloader` and `Prng.test` were dropped (the specimen tool replaces `dummyloader`).

Deliberately unchanged in Phase 1, because Phase 1 must not change output:

- The "Pizza Hut" sign in `arch02` (fact 10). Removing it changes the markup, so it goes in Phase 2.
- The NaN patch in `chunkloader`, scroll-order dependence, unbounded `MEM.chunks`, the full rebuild on every scroll step, white occlusion fills and hard-coded colours.

## Global state that remains

- `rng.js` holds one generator state for the whole program, and `noise.js` one permutation table (filled lazily from `random()`). Two worlds in one program share both, so they interfere. Phase 2 step 3 replaces this with chunk-local streams.

## How the page-load order is reproduced

Upstream's world depends on the exact sequence of random calls, including the paper texture after the first screen (PLAN.md facts 12 and 13). `compat/main.js` and `test/support/replay.js` both do: fresh noise table, `seed(SEED)`, `createWorld()`, first `update()`, `paperTexture()`, then any scrolling.

## Tests and checks

| Check | Command | What it proves |
|-------|---------|----------------|
| Golden, in Node | `pnpm test` (`test/golden.test.js`) | All 5 seeds, all 9 scroll steps and every chunk match upstream, after normalising full-precision `transform` numbers (Node's V8 differs from Chromium's in the last bit of one sign rotation). |
| Golden, byte for byte | `pnpm golden:check --source modules` | The compatibility page in Chromium matches upstream exactly. |
| Upstream untouched | `pnpm test` (`test/upstream.test.js`) | `upstream/index.html` has not been edited. |
| No DOM | `pnpm test` (`test/no-dom.test.js`) | No file in `src/` names a DOM global; tests run with no `window` or `document`. |
| Determinism | `pnpm test` (`test/determinism.test.js`) | Same seed twice is identical; different seeds differ. |
| Worker thread | `pnpm test` (`test/worker.test.js`) | Generation in a Node worker thread equals the main thread. |
| Visual | `pnpm sheet --source modules` | Contact sheet; pixel-identical to `pnpm sheet` (upstream) at Checkpoint 1. |
