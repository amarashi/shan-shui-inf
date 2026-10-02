// The coast scene's layer registry and paint depths, in their own module so layer modules
// (coast.js, coast-life.js) can register without importing each other.
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
