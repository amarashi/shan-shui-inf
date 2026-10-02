// Chunk generation for one seed and scene: the pure part of a world. chunk(k) depends only
// on (seed, scene, k), so it runs the same in Node, in a Web Worker and on the page, in any
// order.
import { createNoise, withNoise } from "../noise.js";
import { ink } from "../render/palette.js";
import { toSVG } from "../render/svg.js";
import { stream, withRandom } from "../rng.js";
import { SCENES } from "./scenes/index.js";

/**
 * A drawn part: one record's output (a mountain, its water, a stretch of sea), with markup.
 * @typedef {{id: string, tag: string, x: number, y: number, k: number, i: number, p: number,
 *   canv: string, list?: object[]}} Part
 */

/**
 * @param {{seed: string, scene?: string, palette?: {paint: Function}, layers?: string[]}} opts
 *   layers: draw only these layers (coast scene; used by specimen sheets)
 */
export function createGenerator(opts) {
  var seed = String(opts.seed);
  var scene = SCENES[opts.scene || "upstream"];
  if (!scene) throw new Error("unknown scene " + opts.scene);
  var palette = opts.palette || ink;
  var noise = createNoise(stream(seed, "noise"));
  var ctx = withNoise(noise, () => scene.context(seed));

  /**
   * Plan chunk k and draw every record from its own stream.
   * @param {number} k
   * @returns {Part[]}
   */
  function chunk(k) {
    return withNoise(noise, function () {
      var recs = scene.plan(k, ctx, opts.layers);
      var out = [];
      recs.forEach(function (r, i) {
        var layer = scene.layers[r.tag];
        if (!layer) return;
        var drawn = withRandom(stream(seed, "draw", k, i), function () {
          return layer.draw(r, i, ctx);
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
    scene: scene,
    noise: noise,
    context: ctx,
    chunk: chunk,
    /** Forget cached plans for chunks outside [kmin, kmax]. */
    forget: (kmin, kmax) => scene.forget(ctx, kmin, kmax),
  };
}
