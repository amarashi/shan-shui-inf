// The coast scene (PLAN.md Phase 3): sky, far headlands, sea, surf, swash, beach and
// headlands, back to front. Every layer reads the same coast model.
import { createCoast } from "../coast.js";
import { CHUNK } from "../plan.js";

/** Paint order of the coast layers: smaller is further back. */
export const DEPTH = {
  sky: -60000,
  far: -50000,
  sea: -40000,
  stacks: -35000,
  surf: -30000,
  beach: -20000,
  swash: -15000,
  headland: -10000,
  near: 0,
};

/** @type {Record<string, {name: string, draw: Function, plan?: Function}>} */
export const COAST_LAYERS = {};

/**
 * Register a coast layer. plan(k, ctx) returns the layer's records for chunk k (default: one
 * record spanning the chunk); draw(record, i, ctx) returns parts [{y, list}].
 */
export function registerCoastLayer(layer) {
  COAST_LAYERS[layer.name] = layer;
}

/** One record covering chunk k, for layers that are continuous bands. */
export function band(name, k) {
  return [{ tag: name, x: k * CHUNK, y: DEPTH[name], x0: k * CHUNK, x1: (k + 1) * CHUNK }];
}

export const coast = {
  name: "coast",
  zoom: 1,
  margin: 700,
  reach: 0,
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
