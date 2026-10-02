// Watercolour washes behind everything (PLAN.md Phase 5): a graded sky, a sea graded from
// deep at the horizon to shallow at the shore, wet and dry sand, and a vegetated wash behind
// the dunes. They are bodies, so the ink palette paints them white and the multiply blend
// over the paper makes them vanish: the ink look is unchanged.
import { Noise } from "../noise.js";
import { poly } from "../render/displaylist.js";
import { NONE, wash } from "../render/palette.js";

const STEP = 16;

/** A band between two curves over [x0, x1], filled with fill. */
function band(x0, x1, top, bottom, fill) {
  var a = [];
  var b = [];
  for (var x = x0; x <= x1 + STEP; x += STEP) {
    var xx = Math.min(x, x1);
    a.push([xx, top(xx)]);
    b.push([xx, bottom(xx)]);
  }
  return poly(a.concat(b.reverse()), { fil: fill, str: NONE });
}

export function washes(x0, x1, coast) {
  var canv = [];
  // overlap neighbouring chunks a little so no hairline shows between them
  x0 -= 1;
  x1 += 1;
  var wob = (x, k) => 3 * Noise.z(x * 0.004, k * 1.7);

  // sky: top of the picture to the horizon
  var N = 8;
  for (var k = 0; k < N; k++) {
    var t0 = (k / N) * coast.yh;
    var t1 = ((k + 1) / N) * coast.yh;
    canv.push(...band(x0, x1, (x) => (k === 0 ? 0 : t0 + wob(x, k)), (x) => (k === N - 1 ? coast.yh + 2 : t1 + wob(x, k + 1)), wash("sky", k / (N - 1))));
  }

  // sea: horizon to the shore, deep to shallow
  var M = 16;
  for (var j = 0; j < M; j++) {
    var f0 = Math.pow(j / M, 1.4);
    var f1 = Math.pow((j + 1) / M, 1.4);
    canv.push(
      ...band(
        x0,
        x1,
        (x) => coast.yh + (coast.shore(x) - coast.yh) * f0,
        (x) => (j === M - 1 ? coast.shore(x) + 3 : coast.yh + (coast.shore(x) - coast.yh) * f1),
        wash("water", j / (M - 1)),
      ),
    );
  }

  // land on beaches: wet sand, dry sand, vegetated back-dune (headlands paint their own)
  for (var seg of coast.segmentsIn(x0, x1)) {
    if (seg.type !== "beach") continue;
    var a0 = Math.max(x0, seg.x0 - 1);
    var a1 = Math.min(x1, seg.x1 + 1);
    var wet = (x) => {
      var a = coast.at(x);
      return a.shore + (a.dune - a.shore) * 0.14;
    };
    canv.push(...band(a0, a1, (x) => coast.shore(x), wet, wash("sand", 1)));
    canv.push(...band(a0, a1, wet, (x) => coast.dune(x) + 6, wash("sand", 0)));
    canv.push(...band(a0, a1, (x) => coast.dune(x) + 6, () => coast.H + 2, wash("foliage", 0.2)));
  }
  return canv;
}
