// View rules shared by the synchronous world (chunks.js) and the page-side scroller: which
// chunks a view needs, which to evict, what is in view and in what order to paint. Kept
// free of generation code, so the page bundle does not carry the generator (it lives in
// the worker).

export const CHUNK = 512;
/** Default view size in world units, as upstream (MEM.windx, MEM.windy). */
export const WINDX = 3000;
export const WINDY = 800;
/** Chunks further than this beyond either edge of the view are evicted. */
export const KEEP = 2 * CHUNK;

/**
 * Per-scene view settings.
 *   zoom    upstream's calcViewBox zoom (the coast shows the full height)
 *   margin  a part is drawn if its record x is within this of the view
 *   reach   furthest a planned record lands from its own chunk
 */
export const SCENE_VIEW = {
  upstream: { name: "upstream", zoom: 1.142, margin: 512, reach: 700 },
  coast: { name: "coast", zoom: 1, margin: 700, reach: 0 },
};

/** Chunk indices that can put a record inside [xmin, xmax], as [kmin, kmax]. */
export function span(xmin, xmax, scene = SCENE_VIEW.upstream) {
  return [Math.floor((xmin - scene.reach) / CHUNK), Math.floor((xmax + scene.reach) / CHUNK)];
}

/** Chunks to have loaded, and the range to keep, for a view [cursx, cursx + width]. */
export function needs(cursx, scene = SCENE_VIEW.upstream, width = WINDX) {
  var lo = cursx - scene.margin;
  var hi = cursx + width + scene.margin;
  return { load: span(lo, hi, scene), keep: span(lo - KEEP, hi + KEEP, scene) };
}

/**
 * Painter's order: larger y is nearer. Ties break by chunk, record and part, so the order
 * never depends on which chunk was generated first.
 */
export function byDepth(a, b) {
  return a.y - b.y || a.k - b.k || a.i - b.i || a.p - b.p;
}

/** Upstream's chunkrender rule: parts whose record x is within the scene's margin of the view. */
export function inView(part, cursx, scene = SCENE_VIEW.upstream, width = WINDX) {
  return cursx - scene.margin < part.x && part.x < cursx + width + scene.margin;
}

/** From upstream calcViewBox(); the zoom is the scene's. */
export function viewBox(cursx, scene = SCENE_VIEW.upstream) {
  var zoom = scene.zoom;
  return "" + cursx + " 0 " + WINDX / zoom + " " + WINDY / zoom;
}
