# coast-inf: an Australian coastal fork of {Shan, Shui}*

Plan for Claude Code. Working title `coast-inf` (rename freely).

Owner: Amir Marashi. Written 2 October 2026.

## 0. How to use this file

Suggested kickoff prompt:

> Read PLAN.md in full. Start at Phase 0 and work through the phases in order. Commit after each numbered step. Stop at every CHECKPOINT, show me the contact sheets, and wait for my go-ahead. If something in the plan conflicts with what you find in the code, trust the code, tell me, and update the plan.

Working rules for the agent:

1. Read all of the upstream `index.html` before changing anything. (Done 2 October 2026; the tail is now verified, see facts 11 to 15 in section 3.)
2. Search GitHub before implementing each new generator or utility. Log what you found and what you decided in `docs/prior-art.md`. Use established packages for generic problems (build, tests, rasterising, noise, PRNG). Write bespoke code only for the art itself.
3. Only copy code from repositories with a compatible licence. No licence file means reference only.
4. Look at what you draw. After any visual change, render the contact sheet (Phase 0, step 4) and open the PNG. Do not judge art from code alone.
5. No new runtime dependency without a one-line justification in `docs/decisions.md`. Check current versions at install time; do not pin from memory.
6. Docs and UI copy in Australian English, no em-dashes.

## 1. Goal

A browser library that draws a new, seeded, infinitely scrolling Australian coastal landscape on each page load: sea to a horizon, surf, beaches, sandstone headlands, coastal flora, small figures and structures. It keeps the hand-drawn brush quality of the original and adds colour as watercolour-style washes. It must embed safely in an ordinary website.

Not goals for v1: photorealism, 3D, animation of the water, other regions (see stretch list).

## 2. Decisions already made (defaults, change if Amir says otherwise)

| # | Decision | Default | Alternative |
|---|----------|---------|-------------|
| D1 | Art direction | **Pure monochrome ink (decided by Amir, 3 October 2026: "dont use colours, keep it black and white")** | Ink line plus watercolour wash (built in Phase 5, then reverted) |
| D2 | Region for v1 | Temperate east coast: honey sandstone headlands, pocket beaches, eucalypt and heath | Great Ocean Road, tropical north, red centre (stretch) |
| D3 | Viewpoint | From land looking out to sea, scrolling along the coast | From the water looking at the coast, as upstream does |
| D4 | Language | Plain modern JavaScript (ES modules) with JSDoc types | TypeScript |
| D5 | Packaging | Framework-agnostic ES module plus a custom element | React component |
| D6 | Tooling language | Node, to keep one toolchain | Python (Playwright + Pillow) for the review tools if preferred |
| D7 | Output | SVG, as upstream | Canvas 2D backend if performance requires (Phase 6) |

The core has to be JavaScript because it runs in the visitor's browser.

## 3. What the upstream code actually is

Source: https://github.com/LingDong-/shan-shui-inf, one `index.html`, 15 commits, MIT.

Structure (names are exact):

- `Prng`: custom generator. It **replaces `Math.random`** and adds `Math.seed`. Seed comes from `?seed=` or the current time. `Prng.hash` uses `window.btoa`.
- `Noise`: Perlin noise copied from p5.js (the source comment links to p5's `noise.js`). Its table is filled lazily from `Math.random` on first call.
- `PolyTools` (`midPt`, `triangulate`) and utilities (`mapval`, `loopNoise`, `randChoice`, `normRand`, `wtrand`, `randGaussian`, `bezmh`, `poly`).
- Brush primitives: `stroke`, `blob`, `div`, `texture`.
- `Tree.tree01` to `tree08` (private helpers `branch`, `twig`, `barkify`).
- `Mount.mountain`, `flatMount`, `flatDec`, `distMount`, `rock` (private `foot`).
- `Arch.arch01` to `arch04`, `boat01`, `transmissionTower01` (private `hut`, `box`, `deco`, `rail`, `roof`, `pagroof`, `flip`).
- `Man.man`, `hat01`, `hat02`, `stick01`.
- `water`, `mountplanner`, `chunkloader`, `chunkrender`, `update`, global `MEM`.
- `dummyloader`: a specimen renderer that appears to be unused (one element every 200 px, with alternatives commented out). This is the upstream author's own review tool and the model for our specimen sheets.

Facts that shape the plan:

1. **Everything is drawn through `poly()`**, which returns an SVG `<polyline>` string. The only exceptions are one `<text>` in `roof` and debug `<circle>`s. So one choke point controls rendering and colour.
2. **Colour is hard-coded** as strings like `rgba(100,100,100,0.5)` at most call sites, with white fills used for occlusion (a mountain's white body hides what is behind it). `tree01`, `tree02`, `tree03` and `tree07` parse their `col` argument by string-splitting on `rgba(`, so colour formats cannot change without fixing that.
3. **Implicit globals.** `stroke` and the private `expand` helper inside `Man` assign `vtxlist0`, `vtxlist1`, `vtxlist` without declaring them; `tree01`, `tree03`, `tree07` assign `reso`; `SEED`, `MEM`, `mouseX`, `mouseY` are implicit too. ES modules are strict mode, so these throw until declared. `update` calls `self.chunkloader`.
4. **Layout.** `mountplanner(xmin, xmax)` returns records tagged `mount`, `distmount`, `flatmount` or `boat`. `chunkloader` dispatches on the tag with an if/else chain and keeps `MEM.chunks` sorted by `y` (painter's algorithm: larger `y` is nearer). Each mountain also adds a `water` chunk at `y - 10000` so it draws first.
5. **Order dependence.** The planner calls `Math.random`, so the world you get depends on the order chunks were generated (scroll left first and you get a different world).
6. **No eviction.** `MEM.chunks` only grows. `needupdate()` returns `true` unconditionally, so every scroll step rebuilds the whole SVG through `innerHTML`.
7. **NaN patch.** `chunkloader` replaces `NaN` with `-1000` in output. Some generator produces NaN sometimes; find out which.
8. **Water is minimal.** `water()` draws a few clusters of sine-wave strokes under each mountain. There is no sea, horizon, shoreline, surf or sand anywhere.
9. **Figures.** `Man.man` is a 9-joint skeleton drawn with `cloth` shapes for head, body and two sleeves, with only one leg chain (so it reads as a robe). `hat` and `ite` (carried item) are pluggable arguments. Figures appear in only two places: the boat (with `hat02` and `stick01`) and the `arch01` pavilion. There are no faces or skin.
10. **Easter egg.** `arch02` puts a "Pizza Hut" sign on one in three single-storey buildings. Remove it (real brand).
11. **Canvas.** World window is 3000 x 800 (`MEM.windx`, `MEM.windy`), chunk width 512, SVG uses `mix-blend-mode: multiply`. `calcViewBox` applies a zoom of 1.142, so the visible part of the world is about 2627 x 700 units, scaled up to fill the 3000 x 800 pixel SVG.
12. **Paper texture (verified 2 October 2026).** The last script block draws a 512 x 512 noise tile on a hidden `<canvas id="bgcanv">` (warm off-white, mirrored in four quadrants) and sets it as the background of `#BG` and `<body>`. It runs after the first `update()` and consumes about 66,000 `Math.random()` calls plus `Noise.noise` calls. So every chunk generated later (on scroll) depends on that consumption. A module port must replay it to match the golden hashes for scroll steps.
13. **Load order.** On page load the sequence is: seed from `?seed=` (raw, not URL-decoded) or the time, `update()` from an inline script inside `#BG`, `present()` (scrolls the page, no randomness), then the paper texture. The UI arrows call `xcroll(±200)`; the menu step defaults to 200.
14. `tree02` parses its `rgba(` colour string but never uses the result. Only `tree01`, `tree03` and `tree07` depend on the parsing.
15. The fork inherited upstream's `CNAME` (upstream's custom domain). It was removed in Phase 0 so GitHub Pages on the fork never tries to claim that domain.

### Licence note (not legal advice, confirm before publishing)

Upstream is MIT: keep its copyright notice and licence text. The Perlin noise block descends from p5.js, which is LGPL 2.1; a Rust port of this project (NiklasNeugebauer/shanshui-screensaver) keeps that file under LGPL for this reason. Either isolate the noise in its own module with an LGPL header, or replace it with a permissively licensed noise library in Phase 2, when output is allowed to change.

### Prior art found (2 October 2026)

- zverok, "Grokking Shan Shui" blog series: a walkthrough of how the code works. Read first. https://zverok.github.io/blog/2021-12-28-grok-shan-shui.html
- RedContritio/shan_shui_inf: TypeScript and React re-implementation with a visual catalogue of every component. No licence file visible, so reference only.
- zautumnz/shanshui-cli (npm `shanshui-cli`, MIT): Node command-line version, proves headless generation works.
- dheera/shan-shui-inf: Node adaptation for an e-ink display.
- These searches covered ports of the original only. None of the ports found is a coastal or non-Chinese adaptation, but that was not searched for specifically. Do that search before Phase 3 (terms: procedural coastline svg, generative waves javascript, procedural eucalyptus tree, plotter seascape).

## 4. Target architecture

```
src/
  rng.js          seeded PRNG, hash, chunk-local streams (no Math.random patching)
  noise.js        Perlin noise (isolated for the licence reason above)
  geom.js         PolyTools and numeric utilities
  brush.js        stroke, blob, div, texture
  render/
    displaylist.js  primitives as data: {pts, fill, stroke, width, role}
    svg.js          display list to SVG
    palette.js      colour roles and palettes
  elements/
    flora.js        upstream trees plus gum, heath, casuarina, norfolk pine, grass tree, dune grass
    terrain.js      upstream mounts plus headland, stack, rock platform
    sea.js          swell, breakers, swash, foam
    beach.js        sand, wet sand, dunes, wrack
    sky.js          wash, clouds, birds
    structures.js   lighthouse, surf club, shack, jetty, ocean pool, flags, boats
    figures.js      person with poses, outfits, hats, items
  world/
    coast.js        coast grammar: segments, shoreline, horizon
    layers.js       layer registry (replaces the tag if/else)
    chunks.js       chunk cache, eviction, ordering
  embed/
    mount.js        mount(el, options), custom element, worker bridge
    worker.js
tools/              render, contact sheet, specimen sheet, perf, golden
test/
upstream/index.html  untouched copy for the golden test
```

Principles: generation is pure (no DOM, no globals), so it runs in a Web Worker and in Node. Rendering and embedding are thin layers on top.

## 5. Phases

Size guide: S is hours, M is a day or two, L is several days of agent work with review.

### Phase 0: baseline and review harness (S)

1. Fork upstream. Copy `index.html` to `upstream/index.html` and never edit it. Keep `LICENSE`; add a `NOTICE` describing the fork.
2. Set up Vite, Vitest and Playwright. Add `sharp` (or similar) for SVG to PNG.
3. **Golden master.** With Playwright, load `upstream/index.html?seed=S`, run a fixed scroll script (for example: initial view, right 3 times, left 5 times, using `xcroll`), read `MEM.canv`, store its SHA-256 and the SVG. Seeds: `1`, `42`, `coast`, `sydney`, `1234567890123`. The scroll script matters because of fact 5.
   *As built:* steps are load, then `xcroll(400)` 3 times and `xcroll(-400)` 5 times. `golden/upstream.json` stores the SHA-256 of `MEM.canv` after every step, plus a hash, tag, x and y for every chunk in `MEM.chunks` at the end, so a Phase 1 mismatch can be traced to one chunk. The SVG itself is **not** stored: the on-screen markup is about 14 MB per step, and the upstream page regenerates it exactly on demand (`pnpm golden:check` confirms this).
4. **Contact sheet tool.** `npm run sheet` renders 8 fixed seeds to PNGs and tiles them in one image. This is how you and Amir review work.
5. **Specimen sheet tool.** `npm run specimen -- gum` renders 12 variations of one element on a grid (modelled on upstream `dummyloader`).
6. **Baseline metrics.** Record for upstream: generation time for the first screen, SVG element count, SVG byte size, on desktop and with Playwright's mobile CPU throttling. Write them to `docs/baseline.md`. Later budgets are set relative to these numbers.

Done when: golden hashes are committed, both sheet tools produce images, baseline numbers are written down.

*As built (2 October 2026):* `pnpm golden:record|golden:check`, `pnpm sheet`, `pnpm specimen -- <element>`, `pnpm perf`. Sheets are rasterised by Chromium screenshots (what visitors see, including multiply blending over the paper) and tiled with sharp. "Mobile CPU" means Chromium's 4x CPU throttling through the DevTools protocol, because Playwright has no built-in CPU throttling. Baseline medians: first screen in about 0.6 s on desktop and 2.8 s throttled, about 41,000 SVG elements and 14 MB of markup, and each scroll step rebuilds everything (0.14 s desktop, 0.66 s throttled).

### Phase 1: modularise with zero change in output (M)

1. Split the script blocks into the modules in section 4 (upstream elements only). Declare the implicit globals (fact 3).
2. Replace the `Math.random` override with an exported `random()` from `rng.js`, same algorithm, **same call order**. Same for seeding and `Noise`.
3. Remove `window` and `document` use from generation code (`btoa` is a global in workers and current Node).
4. Keep a thin compatibility page that reproduces upstream behaviour from the modules.
5. Add tests: golden hashes match byte for byte; same seed twice gives identical output; generation runs in Node without a DOM.

Rules: no clean-ups that change numeric results, no reordering of random calls, no colour changes. If a hash breaks, bisect; do not re-record.

Known limit: golden hashes hold for the engine that recorded them (Chromium/V8). `Math.sin`, `Math.pow` and friends are not guaranteed bit-identical across JavaScript engines, so the same seed may differ slightly in Firefox or Safari. Do not promise cross-browser identical paintings.

*As built (3 October 2026):*

- The modules were produced by a conversion script that copies upstream line ranges and applies a short list of edits, so the code is upstream's line for line. See `docs/architecture.md`.
- Step 3 needed no code change: `btoa` is global, and the DOM code (`update`'s `innerHTML`, the UI, the canvas) stayed in the compatibility page. `test/no-dom.test.js` guards it.
- The "known limit" showed up even between two V8 versions. Node 24 and Chromium 151 differ in the last bit of one full-precision number (a sign's `rotate()`, seed `1234567890123`); every other number is hidden by `toFixed(1)`. So the Node test compares hashes after rounding numbers in `transform` attributes, and `pnpm golden:check --source modules` checks byte for byte in Chromium. Both pass.
- The compatibility page is the root `index.html` (no doctype, like upstream, so layout matches). Its contact sheet is pixel-identical to upstream's.
- Removing the "Pizza Hut" sign (fact 10) moves to Phase 2, because it changes output.

**CHECKPOINT 1**: golden test green, module map in `docs/architecture.md`.

### Phase 2: engine upgrades (M to L). Output may change; re-record goldens once at the end.

1. **Display list.** `poly()` pushes `{pts, fill, stroke, width, role}` records; `render/svg.js` turns them into markup. Replace the `rgba(` string parsing in the trees with structured colour.
2. **Palette roles.** Every primitive gets a role (`ink`, `occlude`, `rock`, `foliage`, `trunk`, `water`, `foam`, `sand`, `sky`, `structure`, `cloth`). The palette maps role plus alpha to a colour. An `ink` palette must reproduce the upstream look.
   *As built:* roles sit on each colour, not on the record, because a shape's fill and outline are often different things (a trunk's body and its bark line). There is no `occlude` role: upstream's white occlusion fills are `body(role)`, the opaque body of a material, so Phase 5 can tint each body by what it is. Colours are `tone(role, alpha, rgb)`, `body(role)`, `NONE` and `CLEAR` (`src/render/palette.js`). The `ink` palette prints upstream's exact strings, so the golden master still matches byte for byte. A diagnostic `roles` palette paints each role in false colour (`pnpm sheet --source modules --palette roles`).
3. **Chunk-local randomness.** Each chunk and layer gets its own stream from `hash(seed, layer, chunkIndex)`. Then the world is independent of scroll order, chunks can be generated in any order in a worker, and evicted chunks regenerate identically. Test: generate chunks in three different orders, output identical.
   *As built:* streams come from `pure-rand` (`stream(seed, "mounts", k)`, `stream(seed, "extras", k)`, `stream(seed, "draw", k, i)` per record). Upstream's shared `planmtx` coverage made flat-island placement depend on scroll order, so planning is two-stage: mountains per chunk first, then extras using mountains of chunks k-2 to k+2. Paint order breaks ties in y by chunk, record and part. `test/order.test.js` passes. This is where output stops matching upstream; `test/golden.test.js` was retired, and `pnpm golden:check` still verifies upstream itself. Step 9 was done at the same time (see below).
4. **Chunk cache with eviction.** Bounded memory during long auto-scroll.
5. **Layer registry.** Replace the tag if/else in `chunkloader` with registered layers: `{name, depth, plan(chunk, coast), draw(record)}`.
6. **Incremental DOM.** One `<g>` per chunk, inserted in depth order, added and removed as chunks enter and leave. Stop rebuilding the whole SVG on scroll.
7. **Worker.** Generate off the main thread; main thread only inserts markup.
8. **Fix the NaN source** (fact 7) and add a test that output never contains `NaN`.
   *As built (done before step 3, while the golden still held):* no generator in this version produces NaN. A search of about 62,000 chunks from 490 worlds (timestamp seeds, word seeds, and scrolls to ±20,000) found none, so the patch was dead code and removing it changed no output. `test/no-nan.test.js` checks that every number in every display list is finite.
9. Decide the noise licence question (isolate or replace).
   *Decided: replaced* with `simplex-noise` (MIT), calibrated to p5's mean, spread and smoothness so upstream's thresholds still work (`docs/decisions.md`). No LGPL code remains in `src/`. The contact sheet in the ink palette was reviewed on 3 October 2026: same style and density as upstream.
10. Remove the "Pizza Hut" sign from `arch02` (fact 10; deferred from Phase 1 because it changes output).

Done when: upstream scene still renders (visually equivalent under the `ink` palette, reviewed on the contact sheet), order-independence test passes, memory is bounded, first screen appears without blocking the main thread.

*As built (3 October 2026), all done:*

- Order of work: steps 1, 2, 8 and 5 first, because they could be done with output byte for byte equal to upstream, so the upstream golden still guarded them. Output changes from step 3 on.
- Step 4: chunks more than two chunk widths beyond the view are evicted; 200 scroll steps hold at most 20 chunks.
- Step 5: `registerLayer({name, draw})`. Planning stays in `world/plan.js` for now; per-layer `plan()` hooks arrive with the coast layers in Phase 3.
- Step 6: one `<g>` per drawn *part*, not per chunk, because paint order interleaves parts of different chunks. A cached scroll step fell from 142 ms (upstream) to about 11 ms.
- Step 7: generation and the paper texture run in a module Web Worker; the page only inserts markup. Longest main-thread task while loading under 4x CPU throttling: 2.6 to 4.2 s upstream, 0.07 to 0.29 s now. Pages that use the worker need Vite (workers ignore import maps), so `pnpm dev` serves the compatibility page.
- Goldens re-recorded once: `golden/engine.json` (`test/engine-golden.test.js`). `golden/upstream.json` remains the record of upstream itself.
- Details in `docs/architecture.md` and `docs/decisions.md`.

### Phase 3: coastal composition (L). This is the core of the project.

Coordinates: height H = 800. Smaller y is further away, as upstream.

**3.1 Coast model (`world/coast.js`)**

- Horizon at `yh`, default 0.38 H, constant.
- The coast is a sequence of segments along x, generated deterministically outward from x = 0 in both directions, each from `hash(seed, index)`: `beach` (width 900 to 2600) alternating with `headland` (500 to 1100). Rare variants: `estuary`, `stacks` offshore of a headland.
- `shore(x)`: the waterline. Inside a beach it is a crescent, lowest on screen mid-bay and rising towards each headland, plus low-amplitude noise and small regular cusps. It must be continuous across segment boundaries.
- `dune(x)`: back-of-beach line below `shore(x)`.
- Expose `coast.at(x)` returning `{segment, t, shore, dune, yh}`. All layers read this one object so they agree.

Tests: segments tile with no gaps or overlaps; `shore` is continuous; `yh < shore(x) < dune(x) < H` everywhere.

**3.2 Layers, back to front**

| Layer | Content | Built from |
|-------|---------|-----------|
| sky | Graded wash, cloud bands, optional sun, a few birds | new; `blob`, `stroke` |
| far | Distant headlands and islands sitting on the horizon, pale | `distMount`, low height |
| sea | Swell lines between `yh` and `shore(x)` | new; `stroke` |
| stacks | Occasional sea stacks | `rock`, tall, with foam at base |
| surf | 2 to 4 breaker lines following the shoreline | new |
| swash | Foam edge and wet-sand band at `shore(x)` | new |
| beach | Sand, tide wrack, dunes with grass tufts | new; `texture`, `blob` |
| headland | Cliff mass with strata, vegetated top, rock platform, foam at base | `flatMount` and `mountain` as starting points |
| near | Foreground heath and framing trees, sparse | flora |

Sea: for n swell lines use `y_k = yh + (shore - yh) * (k/n)^2` so spacing opens towards the viewer; stroke length, wave amplitude and opacity also grow towards the viewer. Colour grades from deep at the horizon to shallow near shore.

Surf: each breaker is broken into runs (waves break in sections). Draw a foam body (clustered white blobs with an irregular top edge), a darker shadow stroke under the lip, and trailing foam streaks behind. Offset each line from `shore(x)` so the lines follow the bay.

Swash: a lobed, scalloped line generated with noise, a thin darker wet-sand band behind it, and a faint reflection strip.

Headland: start from `flatMount`, which already clips the top flat, computes the bounds of the flat area and passes them to `flatDec` for decoration. Change the profile to be asymmetric (steep seaward face). Replace the contour-following `texture` with sandstone strata: near-horizontal bedding strokes with a slight dip, vertical joints, undercuts near the base. Add talus (`rock`) and a rock platform polygon at the waterline with white foam.

**3.3 Review loop**

Build each layer in isolation on a specimen sheet first, then compose. After composing, check the contact sheet for: a readable horizon, clear separation of sea, surf, sand and land, depth (far things paler and finer), and variety between seeds.

*As built, first pass (3 October 2026):*

- The engine has scenes: `upstream` (the original, pinned by the engine golden) and `coast` (`src/world/scenes/`). The page shows the coast by default; `?scene=upstream` shows the original. The coast view uses the full 800 units of height (no upstream zoom).
- Layers: `sky` (cloud bands, birds), `far` (upstream `distMount`, low and pale, on the horizon), `sea` (swell rows spaced against a fixed depth, ending at the waterline), `stacks` (off the steep flank of "stacks" headlands), `surf` (2 to 4 breaker lines per beach, broken into runs with bumpy foam crests and a shaded face), `beach` (dune crest with hummocks and hatching, marram tufts, sand stipple, tide wrack), `swash` (lobed foam edge, wet sand, reflection), `headland` (asymmetric sandstone mesa with strata, joints, undercut, talus, rock platform, heath top, textured near slope). The `near` layer (foreground heath and trees) is flora and left to Phase 4.
- The swell rows are spaced against a fixed depth bent 30% towards the local shore, not `(shore - yh)` as written above: spacing against the local shore squeezed every row into the thin strip of sea in front of a headland.
- Coast shapes use `Noise.z()` (standardised noise); layers are drawn in pieces on a global lattice so chunks join without seams.
- Found and fixed an upstream bug: `PolyTools.triangulate` recursed forever on very flat triangles (NaN area). Upstream never drew low `distMount`s, so it never hit it.
- Weight: about 4,500 SVG elements and 1.5 MB per first screen (upstream: about 41,000 and 14 MB); 54 ms to generate in Node. `far` alone is about 1,000 elements because of `distMount`'s triangulation; easy to cut later.
- Review tools: `pnpm specimen <layer> [--guides] [--layers a,b] [--w 1000 --x .. --y ..]`, `pnpm sheet --source modules`.

**CHECKPOINT 2**: contact sheet of 8 seeds in the `ink` palette with sky, sea, surf, beach and headlands. Amir reviews composition before any flora, figures or colour work.

### Phase 4: flora, structures, figures (L)

Each item gets a specimen sheet. Search GitHub for prior art first (rule 2).

Flora:

- `gum` (eucalypt): pale smooth trunk with sparse bark blotches instead of `barkify` texture, often leaning or forked, ascending branches, leaves as pendant sickle-shaped `blob`s in clumps with sky showing through. Start from `tree06` (`fracTree`, `twig`).
- `heath` and `banksia`: low rounded scrub; start from `tree02`.
- `casuarina`: wispy drooping needle strokes.
- `norfolkPine`: symmetric tiers of whorled branches (common along urban beaches).
- `grassTree`: dark trunk, grass skirt, tall flower spike.
- `duneGrass`: tufts of short strokes.

Placement: reuse the `vegetate(treeFunc, growthRule, proofRule)` pattern from `Mount.mountain` and the `flatDec` pattern for headland tops.

Structures (replace the pagodas and pavilions; reuse `box`, `rail`, `roof`):

- Lighthouse on some headland tops (replaces the `arch03` slot).
- Surf club or kiosk at the back of some beaches (replaces `arch02`; any sign text is generic, for example KIOSK).
- Beach shack or boat shed (replaces `arch01`).
- Jetty, ocean pool on a rock platform, a pair of red and yellow flags.
- Boats: keep the `boat01` hull; variants are a small sailing boat (far, small) and a dinghy.
- Drop the pagoda roofs. Keep or drop `transmissionTower01` at Amir's call.

Figures (`figures.js`, generalising `Man.man`):

- Add a second leg chain and narrow `fbody` and `fsleeve` so the figure reads as shirt and shorts or trousers, not a robe.
- Hats: brimmed sun hat, cap, none. Items: surfboard, fishing rod, towel, bag.
- Poses via the existing `ang` and `len` arrays: standing, walking, sitting, carrying a board, fishing, prone on a board.
- Placement rules: walkers along the swash, a few people between the flags, fishers on rock platforms, surfers beyond the breakers, someone on the jetty.
- Keep figures small and faceless, as upstream. Their look comes from silhouette and clothing only.

Done when: every element has an approved specimen sheet and appears in the composed scene at sensible scale and frequency.

*As built (3 October 2026; Amir asked to continue through the checkpoints, so specimens were reviewed by Claude):*

- Flora in `src/elements/natives.js`: `gum`, `heath`, `banksia`, `casuarina`, `norfolkPine`, `grassTree`, `duneGrass`. Structures and boats in `src/elements/buildings.js`: `lighthouse` (with keeper's cottage), `kiosk` (sign "KIOSK"), `shack`, `boatShed`, `jetty`, `oceanPool`, `flags` (new `flag-red` and `flag-yellow` roles), `sailboat`, `dinghy`. Figures in `src/elements/people.js`: `person` with poses standing, walking, sitting, carrying, fishing, prone; hats sun, cap, none; items board, rod, towel, bag. All have specimen sheets (`pnpm specimen <name>`).
- Figures are drawn from joint positions per pose rather than upstream's angle chains: easier to read and adjust. Limbs are resampled to 8 points, because `stroke()` widens only interior points (a 3-point limb draws as a diamond).
- Placement (`src/world/scenes/coast-life.js`): layers `near` (sparse foreground flora, Norfolk pine rows behind some beaches), `life` (kiosk, flags with swimmers, walkers, sitters, surfers, shack or boat shed, jetty), `landmarks` (lighthouse on the plateau, ocean pool, fishers), `boats` (only in front of beaches).
- Transmission tower: dropped from the coast scene (open question 4, default taken). Pagodas and pavilions do not appear in the coast scene.
- Found another latent upstream NaN: `distMount` produces NaN unless `len` is a multiple of 50 (its loop steps past the end and takes `pow(negative, 0.5)`). The `far` layer rounds its lengths. `test/coast-scene.test.js` checks finite geometry, roles, order independence and eviction for the coast.

### Phase 5: colour and paper (M)

1. Palettes as data. Starting values to tune by eye, not final:
   - `east-coast` (default): sky `#cfe3ee`, sea deep `#2f6f8f`, sea shallow `#6fb7b7`, foam `#ffffff`, dry sand `#e8d9b5`, wet sand `#c9b48a`, rock `#c98f52`, rock shadow `#8a5a35`, foliage `#7d9070`, trunk `#e9e2d3`, ink `#2b2b2b`.
   - `overcast`, `golden-hour`, and `ink` (monochrome, the upstream look).
2. Washes: the white occlusion fills become tinted fills with slight noise variation in hue and alpha. Lines and texture stay in ink. Multiply blending over the paper gives the watercolour overlap effect.
3. Aerial perspective: far layers shift towards the sky colour and lose contrast.
4. Palette chosen by option or from the seed.

**CHECKPOINT 3**: not needed. Amir chose black and white (D1), so there is no palette to pick.

*As built (3 October 2026):* colour palettes, watercolour washes and aerial perspective were built (commit e0fa440: east-coast, overcast and golden-hour palettes; graded sky and sea washes; paper tint) and then reverted at Amir's request (commit 509649a). The scene stays in the `ink` palette. The colour-role system from Phase 2 remains, because it costs nothing in ink and keeps colour possible later (`git revert 509649a` restores the palettes). The diagnostic `roles` palette is still available to tools.

### Phase 6: embedding, performance, accessibility (M)

API:

```js
import { mount, renderToSVG } from "coast-inf";

const scene = mount(element, {
  seed: "any string",        // default: random
  palette: "east-coast",
  mode: "static",            // "static" | "scroll" | "drift"
  height: 400,
});
scene.reseed();
scene.destroy();

const svg = renderToSVG({ seed: "abc", x0: 0, x1: 3000 }); // Node, for pre-rendering
```

Plus `<coast-inf seed="..." mode="drift" palette="east-coast">`.

Requirements:

- No globals, no `Math.random` patching, styles scoped, safe to mount more than once per page.
- Generation in a worker; paper-coloured placeholder, then fade in.
- Budgets set from the Phase 0 baseline. Proposed targets to validate: first screen visible in about 1 s on a throttled mobile profile, on-screen SVG elements held under a fixed cap, core bundle under roughly 60 kB gzipped. If SVG cannot meet the element cap, add a Canvas 2D backend behind the display list (D7) or rasterise the far layers.
- Accessibility: `role="img"` with a text label; honour `prefers-reduced-motion` (no drift); a visible pause control for any motion that runs longer than 5 seconds.
- A demo page with a "new painting" button, seed display, palette switcher and SVG download.
- README covering install, options, licence and attribution to Lingdong Huang.

**CHECKPOINT 4**: demo page reviewed before any publish step. Do not publish to npm or deploy without Amir's explicit go-ahead.

## 6. Testing summary

| Test | Phase | What it proves |
|------|-------|----------------|
| Golden hash vs upstream | 1 | Refactor changed nothing |
| Same seed twice | 1 onward | Determinism |
| Chunk order independence | 2 onward | World does not depend on scroll history |
| No `NaN` in output | 2 onward | Geometry is valid |
| Coast invariants | 3 onward | Segments tile, bands never cross |
| Runs in Node and in a worker | 1 onward | Core is DOM-free |
| Contact and specimen sheets | all | Human and agent visual review |
| Performance script | 0, 2, 6 | Budgets hold against baseline |

Automated tests cannot tell you whether it looks good. The sheets and the checkpoints are the quality gate for that.

## 7. Risks

- **It looks like clip art.** The upstream charm is in the brushwork (`stroke` width noise, `texture`, `blob`). New elements must be built from those primitives, not from clean geometric shapes. Colour stays as wash, never flat saturated fills.
- **Sea and surf are the hardest to make convincing** and have no upstream precedent. Budget several iterations at Checkpoint 2.
- **SVG weight.** Sand stipple, foam and leaves can explode the element count. Measure per layer.
- **Scope creep.** v1 is one region. Everything else is on the stretch list.
- **Seed reproducibility across browsers** is approximate (see Phase 1 note).

## 8. Guardrails

- Do not imitate Aboriginal and Torres Strait Islander art styles, symbols or motifs.
- No real brands, logos or identifiable real places or people.
- Keep attribution to the upstream author visible in the README and licence files.

## 9. Stretch list (after v1)

- Other regions as presets: Great Ocean Road (limestone stacks, cool palette), tropical north (pandanus, palms, turquoise water), red centre (`flatMount` mesas, spinifex, desert oak, red earth).
- Time of day and weather from the seed or the visitor's clock.
- Gentle motion: foam and swell drift, birds.
- Fauna: gulls, pelicans, a kangaroo on a headland, a cockatoo flock.
- Tide state shifting `shore(x)`.
- Pre-rendered static mode for sites that want zero client cost.

## 10. Open questions for Amir
2. ~~D1: happy with ink plus wash, or pure monochrome?~~ Answered: black and white.
1. What site is this for, and where does it sit on the page (full-width hero, banner strip, background)? This sets height, mode and the performance budget.
2. D1: happy with ink plus wash, or pure monochrome?
3. D3: looking out to sea from land, or looking at the coast from the water?
4. Keep the transmission tower as a nod to the original?
5. Publish as a public package, or keep private?
