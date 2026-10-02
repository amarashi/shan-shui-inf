// The coast scene (PLAN.md Phase 3): sky, far headlands, sea, surf, swash, beach and
// headlands, back to front. Every layer reads the same coast model.
import { createCoast } from "../coast.js";
import { CHUNK } from "../plan.js";
import { SCENE_VIEW } from "../view.js";
import { band, COAST_LAYERS, DEPTH, registerCoastLayer } from "./coast-registry.js";
import { registerLifeLayers } from "./coast-life.js";

export { band, COAST_LAYERS, DEPTH, registerCoastLayer };

export const coast = {
  ...SCENE_VIEW.coast,
  layers: COAST_LAYERS,
  context: (seed) => ({ seed: String(seed), coast: createCoast(seed) }),
  plan: function (k, ctx, only) {
    var out = [];
    for (var name in COAST_LAYERS) {
      if (only && !only.includes(name)) continue;
      var l = COAST_LAYERS[name];
      out.push.apply(out, l.plan ? l.plan(k, ctx) : band(name, k));
    }
    return out;
  },
  forget: () => {},
};

// --- layers, back to front ---
import { swell } from "../../elements/sea.js";

registerCoastLayer({
  name: "sea",
  draw: (r, i, ctx) => [{ y: r.y, list: swell(r.x0, r.x1, ctx.coast) }],
});
import { surf, swash } from "../../elements/sea.js";

registerCoastLayer({
  name: "surf",
  draw: (r, i, ctx) => [{ y: r.y, list: surf(r.x0, r.x1, ctx.coast) }],
});
registerCoastLayer({
  name: "swash",
  draw: (r, i, ctx) => [{ y: r.y, list: swash(r.x0, r.x1, ctx.coast) }],
});
import { beach } from "../../elements/beach.js";

registerCoastLayer({
  name: "beach",
  draw: (r, i, ctx) => [{ y: r.y, list: beach(r.x0, r.x1, ctx.coast) }],
});
import { headland } from "../../elements/headland.js";

// A headland is planned by the chunk that contains its centre.
registerCoastLayer({
  name: "headland",
  plan: function (k, ctx) {
    var out = [];
    for (var seg of ctx.coast.segmentsIn(k * CHUNK - 1200, (k + 1) * CHUNK + 1200)) {
      var xc = (seg.x0 + seg.x1) / 2;
      if (seg.type === "headland" && xc >= k * CHUNK && xc < (k + 1) * CHUNK) {
        out.push({ tag: "headland", x: xc, y: DEPTH.headland, seg: seg.index });
      }
    }
    return out;
  },
  draw: (r, i, ctx) => [{ y: r.y, list: headland(ctx.coast.segmentAt(r.x), ctx.coast) }],
});
import { sky } from "../../elements/sky.js";
import { Mount } from "../../elements/terrain.js";
import { stacks } from "../../elements/headland.js";
import { random } from "../../rng.js";

registerCoastLayer({
  name: "sky",
  draw: (r, i, ctx) => [{ y: r.y, list: sky(r.x0, r.x1, ctx.coast) }],
});

// Distant headlands and islands sitting on the horizon: upstream's distMount, low and pale.
registerCoastLayer({
  name: "far",
  plan: function (k, ctx) {
    var r = ctx.coast.rand("far", k);
    if (r() > 0.3) return [];
    // distMount needs len to be a multiple of span * seg (10 * 5): otherwise its loop steps
    // past the end, where sin() goes negative and pow(.., 0.5) gives NaN.
    return [{ tag: "far", x: k * CHUNK + CHUNK * r(), y: DEPTH.far, len: 50 * Math.round(6 + 18 * r()), hei: 20 + 40 * r() }];
  },
  draw: (r, i, ctx) => [
    { y: r.y, list: Mount.distMount(r.x, ctx.coast.yh + 2, random() * 100, { hei: r.hei, len: r.len, seg: 5 }) },
  ],
});

// Sea stacks, planned with their headland (by the chunk holding its centre).
registerCoastLayer({
  name: "stacks",
  plan: function (k, ctx) {
    var out = [];
    for (var seg of ctx.coast.segmentsIn(k * CHUNK - 1200, (k + 1) * CHUNK + 1200)) {
      var xc = (seg.x0 + seg.x1) / 2;
      if (seg.variant === "stacks" && xc >= k * CHUNK && xc < (k + 1) * CHUNK) {
        out.push({ tag: "stacks", x: xc, y: DEPTH.stacks });
      }
    }
    return out;
  },
  draw: (r, i, ctx) => [{ y: r.y, list: stacks(ctx.coast.segmentAt(r.x), ctx.coast) }],
});

// Phase 4: flora, structures, boats and people, after the landscape layers.
registerLifeLayers();
