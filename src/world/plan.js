// Upstream's mountplanner, made chunk-local.
//
// Upstream planned each 512-unit chunk with the global random sequence and kept mountain
// coverage in a shared array (planmtx), so the world depended on the order chunks were
// generated in. Here every chunk k is planned from its own streams:
//   planMounts(k)  mountains and distant mountains, from stream(seed, "mounts", k)
//   planExtras(k)  flat islands (only where no mountain covers the shore) and boats,
//                  from stream(seed, "extras", k); coverage comes from planMounts of
//                  chunks k-2 to k+2, which are themselves pure functions of (seed, k).
// So plan(k) depends only on (seed, k). Noise is a pure function of position.
import { Noise } from "../noise.js";
import { random, stream, withRandom } from "../rng.js";

export const CHUNK = 512;
/** Furthest a planned record can land from its chunk (flat islands: +-700). */
export const REACH = 700;

const XSTEP = 5;
const MWID = 200; // half-width of the shore a mountain covers
const SAMP = 0.03;

const ns = (x) => Math.max(Noise.noise(x * SAMP) - 0.55, 0) * 2;
const yr = (x) => Noise.noise(x * 0.01, Math.PI);

function locmax(x, f, r) {
  var z0 = f(x);
  if (z0 <= 0.3) return false;
  for (var i = x - r; i < x + r; i++) {
    if (f(i) > z0) return false;
  }
  return true;
}

// Upstream's chadd: skip a record within `mind` (in x) of one already planned.
function chadd(reg, r, mind) {
  mind = mind == undefined ? 10 : mind;
  for (var k = 0; k < reg.length; k++) {
    if (Math.abs(reg[k].x - r.x) < mind) return false;
  }
  reg.push(r);
  return true;
}

/**
 * A planner for one world. Call inside withNoise(world noise).
 * @param {string} seed
 */
export function createPlanner(seed) {
  var mountCache = new Map();

  function planMounts(k) {
    if (mountCache.has(k)) return mountCache.get(k);
    var reg = [];
    withRandom(stream(seed, "mounts", k), function () {
      var xmin = k * CHUNK;
      for (var i = xmin; i < xmin + CHUNK; i += XSTEP) {
        // upstream looped j over depths, but ns() ignores j, so every depth sees the same peak
        var j;
        for (j = 0; j < yr(i) * 480; j += 30) {
          if (locmax(i, ns, 2)) {
            chadd(reg, { tag: "mount", x: i + 2 * (random() - 0.5) * 500, y: j + 300, h: ns(i) });
          }
        }
        if (Math.abs(i) % 1000 < Math.max(1, XSTEP - 1)) {
          chadd(reg, { tag: "distmount", x: i, y: 280 - random() * 50, h: ns(i) });
        }
      }
    });
    mountCache.set(k, reg);
    return reg;
  }

  /** Number of mountains whose shore band covers x (upstream's planmtx, made pure). */
  function coverage(x) {
    var cell = Math.floor(x / XSTEP);
    var k0 = Math.floor(x / CHUNK);
    var n = 0;
    for (var k = k0 - 2; k <= k0 + 2; k++) {
      var ms = planMounts(k);
      for (var m = 0; m < ms.length; m++) {
        if (ms[m].tag !== "mount") continue;
        if (Math.floor((ms[m].x - MWID) / XSTEP) <= cell && cell < (ms[m].x + MWID) / XSTEP) n++;
      }
    }
    return n;
  }

  /** All records planned for chunk k. */
  function plan(k) {
    var reg = planMounts(k).slice();
    withRandom(stream(seed, "extras", k), function () {
      var xmin = k * CHUNK;
      for (var i = xmin; i < xmin + CHUNK; i += XSTEP) {
        if (coverage(i) == 0 && random() < 0.01) {
          for (var j = 0; j < 4 * random(); j++) {
            chadd(reg, { tag: "flatmount", x: i + 2 * (random() - 0.5) * 700, y: 700 - j * 50, h: ns(i) });
          }
        }
      }
      for (var i2 = xmin; i2 < xmin + CHUNK; i2 += XSTEP) {
        if (random() < 0.2) {
          chadd(reg, { tag: "boat", x: i2, y: 300 + random() * 390 }, 400);
        }
      }
    });
    return reg;
  }

  /** Forget cached mountain plans outside [kmin, kmax] (they regenerate identically). */
  function forget(kmin, kmax) {
    for (var k of mountCache.keys()) if (k < kmin || k > kmax) mountCache.delete(k);
  }

  return { plan: plan, forget: forget };
}
