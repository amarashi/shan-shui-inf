// A world: chunks generated on demand, each from its own random streams, painted back to
// front. Same seed, same world, whatever order chunks are generated in.
//
// createWorld({ seed }) returns { MEM, update, xcroll, calcViewBox, noise, chunk }.
// MEM keeps upstream's field names (cursx, windx, windy, cwid, canv, chunks) so the
// compatibility page and tools keep working.
import { createNoise, withNoise } from "../noise.js";
import { ink } from "../render/palette.js";
import { toSVG } from "../render/svg.js";
import { stream, withRandom } from "../rng.js";
import { LAYERS } from "./layers.js";
import { CHUNK, createPlanner, REACH } from "./plan.js";

/**
 * @param {{seed: string, palette?: {paint: Function}}} opts
 */
export function createWorld(opts) {
  var seed = String(opts.seed);
  var palette = opts.palette || ink;
  var noise = createNoise(stream(seed, "noise"));
  var planner = createPlanner(seed);
  /** @type {Map<number, object[]>} chunk index -> parts */
  var cache = new Map();
  var sorted = null; // all parts in paint order, rebuilt when the cache changes

  var MEM = {
    canv: "",
    chunks: [], // parts in paint order, as upstream's MEM.chunks
    cwid: CHUNK,
    cursx: 0,
    windx: 3000,
    windy: 800,
  };

  /** Generate chunk k: plan it, then draw every record from its own stream. Pure in (seed, k). */
  function chunk(k) {
    if (cache.has(k)) return cache.get(k);
    var parts = withNoise(noise, function () {
      var recs = planner.plan(k);
      var out = [];
      recs.forEach(function (r, i) {
        var layer = LAYERS[r.tag];
        if (!layer) return;
        var drawn = withRandom(stream(seed, "draw", k, i), function () {
          return layer.draw(r, i);
        });
        drawn.forEach(function (d, p) {
          out.push({ tag: r.tag, x: r.x, y: d.y, list: d.list, canv: toSVG(d.list, palette), k: k, i: i, p: p });
        });
      });
      return out;
    });
    cache.set(k, parts);
    sorted = null;
    return parts;
  }

  // Painter's order: larger y is nearer. Ties break by chunk, record and part, so the
  // order never depends on which chunk was generated first.
  function byDepth(a, b) {
    return a.y - b.y || a.k - b.k || a.i - b.i || a.p - b.p;
  }

  /** Make sure every chunk that can put a record inside [xmin, xmax] exists. */
  function load(xmin, xmax) {
    var kmin = Math.floor((xmin - REACH) / CHUNK);
    var kmax = Math.floor((xmax + REACH) / CHUNK);
    for (var k = kmin; k <= kmax; k++) chunk(k);
  }

  // Upstream's chunkrender: every part whose record x is within one chunk width of the view.
  function render(xmin, xmax) {
    if (sorted === null) {
      sorted = [];
      for (var parts of cache.values()) sorted.push.apply(sorted, parts);
      sorted.sort(byDepth);
      MEM.chunks = sorted;
    }
    var canv = "";
    for (var i = 0; i < sorted.length; i++) {
      if (xmin - CHUNK < sorted[i].x && sorted[i].x < xmax + CHUNK) canv += sorted[i].canv;
    }
    MEM.canv = canv;
  }

  function update() {
    load(MEM.cursx - CHUNK, MEM.cursx + MEM.windx + CHUNK);
    render(MEM.cursx, MEM.cursx + MEM.windx);
  }
  function xcroll(v) {
    MEM.cursx += v;
    update();
  }
  // From upstream calcViewBox().
  function calcViewBox() {
    var zoom = 1.142;
    return "" + MEM.cursx + " 0 " + MEM.windx / zoom + " " + MEM.windy / zoom;
  }

  return { MEM: MEM, update: update, xcroll: xcroll, calcViewBox: calcViewBox, noise: noise, chunk: chunk };
}
