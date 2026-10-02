// A world: chunks generated on demand, each from its own random streams, painted back to
// front. Same seed, same world, whatever order chunks are generated in.
//
// createWorld({ seed }) is the synchronous world, for Node, tests and pre-rendering:
// it returns { MEM, update, xcroll, calcViewBox, noise, chunk, visible, cached }.
// MEM keeps upstream's field names (cursx, windx, windy, cwid, canv, chunks).
// Chunks far from the view are evicted on update(), so memory stays bounded.
//
// The rules for which chunks a view needs, which to evict and in what order to paint are
// exported, so the page-side scroller (src/embed/scroller.js) follows exactly the same ones.
import { createGenerator } from "./generator.js";
import { CHUNK, REACH } from "./plan.js";

export { CHUNK };

/** View size in world units, as upstream (MEM.windx, MEM.windy). */
export const WINDX = 3000;
export const WINDY = 800;

/** Chunks further than this beyond either edge of the view are evicted. */
export const KEEP = 2 * CHUNK;

/** Chunk indices that can put a record inside [xmin, xmax], as [kmin, kmax]. */
export function span(xmin, xmax) {
  return [Math.floor((xmin - REACH) / CHUNK), Math.floor((xmax + REACH) / CHUNK)];
}

/** Chunks to have loaded, and the range to keep, for a view starting at cursx. */
export function needs(cursx) {
  var lo = cursx - CHUNK;
  var hi = cursx + WINDX + CHUNK;
  return { load: span(lo, hi), keep: span(lo - KEEP, hi + KEEP) };
}

/**
 * Painter's order: larger y is nearer. Ties break by chunk, record and part, so the order
 * never depends on which chunk was generated first.
 */
export function byDepth(a, b) {
  return a.y - b.y || a.k - b.k || a.i - b.i || a.p - b.p;
}

/** Upstream's chunkrender rule: parts whose record x is within one chunk width of the view. */
export function inView(part, cursx) {
  return cursx - CHUNK < part.x && part.x < cursx + WINDX + CHUNK;
}

/** From upstream calcViewBox(). */
export function viewBox(cursx) {
  var zoom = 1.142;
  return "" + cursx + " 0 " + WINDX / zoom + " " + WINDY / zoom;
}

/**
 * @param {{seed: string, palette?: {paint: Function}}} opts
 */
export function createWorld(opts) {
  var gen = createGenerator(opts);
  /** @type {Map<number, import("./generator.js").Part[]>} */
  var cache = new Map();
  var sorted = null; // all cached parts in paint order, rebuilt when the cache changes
  var shown = []; // parts in the view, in paint order

  var MEM = {
    chunks: [], // parts in paint order, as upstream's MEM.chunks
    cwid: CHUNK,
    cursx: 0,
    windx: WINDX,
    windy: WINDY,
  };
  // Markup of the view, built only when read (upstream rebuilt it on every scroll step).
  Object.defineProperty(MEM, "canv", {
    enumerable: true,
    get: function () {
      return shown.map((p) => p.canv).join("");
    },
  });

  function chunk(k) {
    if (!cache.has(k)) {
      cache.set(k, gen.chunk(k));
      sorted = null;
    }
    return cache.get(k);
  }

  function update() {
    var n = needs(MEM.cursx);
    for (var k of cache.keys()) {
      if (k < n.keep[0] || k > n.keep[1]) {
        cache.delete(k);
        sorted = null;
      }
    }
    gen.forget(n.keep[0] - 2, n.keep[1] + 2); // planning reads mountains 2 chunks either side
    for (var k2 = n.load[0]; k2 <= n.load[1]; k2++) chunk(k2);

    if (sorted === null) {
      sorted = [];
      for (var parts of cache.values()) sorted.push.apply(sorted, parts);
      sorted.sort(byDepth);
      MEM.chunks = sorted;
    }
    shown = sorted.filter((p) => inView(p, MEM.cursx));
  }

  function xcroll(v) {
    MEM.cursx += v;
    update();
  }

  return {
    MEM: MEM,
    update: update,
    xcroll: xcroll,
    calcViewBox: function () {
      return viewBox(MEM.cursx);
    },
    noise: gen.noise,
    chunk: chunk,
    /** Parts in the view, in paint order. */
    visible: function () {
      return shown;
    },
    /** Number of chunks held in memory. */
    cached: function () {
      return cache.size;
    },
  };
}
