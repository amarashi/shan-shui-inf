// The coast model (PLAN.md 3.1). Everything that draws the coast reads coast.at(x), so
// sea, surf, sand and headlands always agree on where the water ends.
//
// Picture coordinates: x along the coast, y down the picture; smaller y is further away.
//   horizon   yh = 0.38 H, constant
//   shore(x)  the waterline. In a beach it is a crescent: nearest the viewer (largest y)
//             mid-bay, rising to the far waterline at each end. A headland pushes the
//             waterline further out (smaller y). Noise and cusps are scaled by sin(pi t),
//             which is zero at both ends of every segment, so the line is continuous.
//   dune(x)   the back of the beach, between the shore and the bottom of the picture.
//
// Segments tile x with no gaps: beach (900 to 2600 wide) alternating with headland (500 to
// 1100), generated outward from x = 0, each sized from its own hash, so any x can be
// looked up without generating the coast in order.
import { hash, stream } from "../rng.js";

export const H = 800;
export const YH = Math.round(0.38 * H); // 304

// Where the water meets the land at the ends of each bay and around headlands.
const FAR_SHORE = YH + 0.14 * (H - YH);

/**
 * @typedef {{index: number, type: "beach"|"headland", x0: number, x1: number,
 *   depth: number, tip: number, variant: string|null}} Segment
 */

/** @param {string} seed */
export function createCoast(seed) {
  seed = String(seed);
  // Segment 0 is a beach starting at x = -600, so the first screen opens on a bay.
  var ORIGIN = -600;
  /** @type {Map<number, Segment>} */
  var segs = new Map();
  var bounds = { lo: 0, hi: -1 }; // indices generated so far

  function make(n, x0, x1) {
    var r = stream(seed, "segment", n);
    var beach = ((n % 2) + 2) % 2 === 0;
    var s = {
      index: n,
      type: beach ? "beach" : "headland",
      x0: x0,
      x1: x1,
      // beach: how far towards the viewer the bay's waterline reaches (fraction of sea-to-bottom)
      depth: 0.32 + 0.18 * r(),
      // headland: how far out its tip pushes the waterline (world units)
      tip: 20 + 40 * r(),
      variant: null,
    };
    var v = r();
    if (!beach && v < 0.3) s.variant = "stacks";
    if (beach && v < 0.12) s.variant = "estuary";
    return s;
  }
  function width(n) {
    var beach = ((n % 2) + 2) % 2 === 0;
    var u = hash(seed, "width", n) / 4294967296;
    return beach ? 900 + 1700 * u : 500 + 600 * u;
  }

  /** Segment n, generating the ones between it and those already known. */
  function segment(n) {
    if (bounds.hi < bounds.lo) {
      segs.set(0, make(0, ORIGIN, ORIGIN + width(0)));
      bounds = { lo: 0, hi: 0 };
    }
    while (n > bounds.hi) {
      var prev = segs.get(bounds.hi);
      bounds.hi++;
      segs.set(bounds.hi, make(bounds.hi, prev.x1, prev.x1 + width(bounds.hi)));
    }
    while (n < bounds.lo) {
      var next = segs.get(bounds.lo);
      bounds.lo--;
      segs.set(bounds.lo, make(bounds.lo, next.x0 - width(bounds.lo), next.x0));
    }
    return segs.get(n);
  }

  /** The segment containing x. */
  function segmentAt(x) {
    var s = segment(0);
    while (x >= s.x1) s = segment(s.index + 1);
    while (x < s.x0) s = segment(s.index - 1);
    return s;
  }

  // Gentle noise along the shore, made from the segment's own stream so it is local.
  function wobble(s, t) {
    var r = stream(seed, "wobble", s.index);
    var a = r() * 6.283;
    var b = r() * 6.283;
    var span = s.x1 - s.x0;
    var u = t * span;
    return 6 * Math.sin(u / 97 + a) + 3 * Math.sin(u / 41 + b);
  }

  function shoreIn(s, x) {
    var t = (x - s.x0) / (s.x1 - s.x0);
    var env = Math.sin(Math.PI * t); // 0 at both ends
    if (s.type === "beach") {
      var bay = s.depth * (H - FAR_SHORE) * Math.pow(env, 0.8);
      var cusps = 3 * Math.abs(Math.sin((x - s.x0) / 22)); // small regular scallops
      return FAR_SHORE + bay + env * (wobble(s, t) + cusps);
    }
    return FAR_SHORE - s.tip * Math.pow(env, 0.6) + env * 0.5 * wobble(s, t);
  }

  /**
   * Everything a layer needs to know about the coast at x.
   * @param {number} x
   */
  function at(x) {
    var s = segmentAt(x);
    var shore = shoreIn(s, x);
    var t = (x - s.x0) / (s.x1 - s.x0);
    return {
      segment: s,
      t: t,
      yh: YH,
      shore: shore,
      // back of the beach: 40% of the way from the waterline to the bottom of the picture
      dune: shore + 0.4 * (H - shore),
    };
  }

  /** Segments overlapping [xmin, xmax]. */
  function segmentsIn(xmin, xmax) {
    var out = [];
    for (var s = segmentAt(xmin); s.x0 < xmax; s = segment(s.index + 1)) out.push(s);
    return out;
  }

  return {
    at: at,
    shore: (x) => at(x).shore,
    dune: (x) => at(x).dune,
    segmentAt: segmentAt,
    segmentsIn: segmentsIn,
    /** A random stream for a coast feature, e.g. rand("surf", segment.index). Same keys, same numbers. */
    rand: (...keys) => stream(seed, ...keys),
    yh: YH,
    H: H,
  };
}
