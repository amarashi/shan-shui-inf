// Page side of a scrolling world: asks a worker for chunks, keeps the ones near the view,
// and syncs them into an SVG group. Generation never runs on the main thread.
//
// The caller creates the worker, so bundlers can see the worker module:
//   const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
//   const s = createScroller({ group, worker, seed: "coast" });
//   await s.ready;             // first screen complete
//   await s.scrollBy(400);     // view complete at the new position
import { createPartView } from "../render/dom.js";
import { byDepth, inView, needs, viewBox } from "../world/chunks.js";

var nextGen = 0;

/**
 * @param {{group: SVGGElement, worker: Worker, seed: string, palette?: string,
 *   onViewBox?: (vb: string) => void}} opts
 */
export function createScroller(opts) {
  var worker = opts.worker;
  var gen = nextGen++;
  var view = createPartView(opts.group);
  var cache = new Map(); // k -> parts
  var requested = new Set();
  var sorted = null;
  var cursx = 0;
  var waiters = [];
  var shown = [];

  worker.postMessage({ type: "init", gen: gen, seed: String(opts.seed), palette: opts.palette || "ink" });
  worker.addEventListener("message", onMessage);

  function onMessage(e) {
    var m = e.data;
    if (m.gen !== gen || m.type !== "chunk") return;
    requested.delete(m.k);
    var n = needs(cursx);
    if (m.k < n.keep[0] || m.k > n.keep[1]) return; // the view moved on
    cache.set(m.k, m.parts);
    sorted = null;
    refresh();
  }

  /** Evict far chunks, request missing ones, paint what is loaded, resolve when complete. */
  function refresh() {
    var n = needs(cursx);
    for (var k of cache.keys()) {
      if (k < n.keep[0] || k > n.keep[1]) {
        cache.delete(k);
        sorted = null;
      }
    }
    worker.postMessage({ type: "forget", gen: gen, kmin: n.keep[0] - 2, kmax: n.keep[1] + 2 });

    // request missing chunks, nearest to the middle of the view first
    var mid = (n.load[0] + n.load[1]) / 2;
    var missing = [];
    for (var k2 = n.load[0]; k2 <= n.load[1]; k2++) {
      if (!cache.has(k2) && !requested.has(k2)) missing.push(k2);
    }
    missing.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    if (missing.length) {
      missing.forEach((k3) => requested.add(k3));
      worker.postMessage({ type: "chunks", gen: gen, ks: missing });
    }

    if (sorted === null) {
      sorted = [];
      for (var parts of cache.values()) sorted.push.apply(sorted, parts);
      sorted.sort(byDepth);
    }
    shown = sorted.filter((p) => inView(p, cursx));
    if (opts.onViewBox) opts.onViewBox(viewBox(cursx));
    view.sync(shown);

    var complete = true;
    for (var k4 = n.load[0]; k4 <= n.load[1]; k4++) if (!cache.has(k4)) complete = false;
    if (complete) waiters.splice(0).forEach((w) => w());
  }

  function settle() {
    return new Promise(function (resolve) {
      waiters.push(resolve);
      refresh();
    });
  }

  var ready = settle();

  return {
    ready: ready,
    /** Move the view to x; resolves when every part for the new view is painted. */
    scrollTo: function (x) {
      cursx = x;
      return settle();
    },
    scrollBy: function (dx) {
      cursx += dx;
      return settle();
    },
    get x() {
      return cursx;
    },
    /** Parts in the view, in paint order. */
    visible: function () {
      return shown;
    },
    /** The paper texture tile as ImageData-compatible pixels, drawn in the worker. */
    paper: function () {
      return new Promise(function (resolve) {
        function onPaper(e) {
          if (e.data.gen !== gen || e.data.type !== "paper") return;
          worker.removeEventListener("message", onPaper);
          resolve(e.data);
        }
        worker.addEventListener("message", onPaper);
        worker.postMessage({ type: "paper", gen: gen });
      });
    },
    destroy: function () {
      worker.removeEventListener("message", onMessage);
      view.sync([]);
    },
  };
}
