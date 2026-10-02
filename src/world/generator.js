// Chunk generation for one seed: the pure part of a world. chunk(k) depends only on
// (seed, k), so it runs the same in Node, in a Web Worker and on the page, in any order.
import { createNoise, withNoise } from "../noise.js";
import { ink } from "../render/palette.js";
import { toSVG } from "../render/svg.js";
import { stream, withRandom } from "../rng.js";
import { LAYERS } from "./layers.js";
import { createPlanner } from "./plan.js";

/**
 * A drawn part: one record's output (a mountain, its water, a boat), with its markup.
 * @typedef {{id: string, tag: string, x: number, y: number, k: number, i: number, p: number,
 *   canv: string, list?: object[]}} Part
 */

/**
 * @param {{seed: string, palette?: {paint: Function}}} opts
 */
export function createGenerator(opts) {
  var seed = String(opts.seed);
  var palette = opts.palette || ink;
  var noise = createNoise(stream(seed, "noise"));
  var planner = createPlanner(seed);

  /**
   * Plan chunk k and draw every record from its own stream.
   * @param {number} k
   * @returns {Part[]}
   */
  function chunk(k) {
    return withNoise(noise, function () {
      var recs = planner.plan(k);
      var out = [];
      recs.forEach(function (r, i) {
        var layer = LAYERS[r.tag];
        if (!layer) return;
        var drawn = withRandom(stream(seed, "draw", k, i), function () {
          return layer.draw(r, i);
        });
        drawn.forEach(function (d, p) {
          out.push({
            id: k + ":" + i + ":" + p,
            tag: r.tag,
            x: r.x,
            y: d.y,
            k: k,
            i: i,
            p: p,
            canv: toSVG(d.list, palette),
            list: d.list,
          });
        });
      });
      return out;
    });
  }

  return {
    seed: seed,
    noise: noise,
    chunk: chunk,
    /** Forget cached plans for chunks outside [kmin, kmax]. */
    forget: planner.forget,
  };
}
