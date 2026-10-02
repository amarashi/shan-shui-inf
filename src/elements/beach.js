// The beach (PLAN.md 3.2): sand, tide wrack, the dune line and dune grass. Drawn only on
// beach segments, in pieces on a global lattice, so chunks join without seams.
import { random } from "../rng.js";
import { stroke } from "../brush.js";
import { Noise } from "../noise.js";
import { tone } from "../render/palette.js";

const PIECE = 64;
const DUNE_PIECE = 128;

function nearness(a, H) {
  return (a.shore - a.yh) / (H - a.yh);
}

/** Call f(p0, p1, seg, r) for each lattice piece that starts in [x0, x1) on a beach. */
function eachPiece(x0, x1, coast, key, f, size = PIECE) {
  for (var b = Math.ceil(x0 / size); b * size < x1; b++) {
    var r = coast.rand(key, b);
    var p0 = b * size + 12 * r();
    var p1 = (b + 1) * size + 12 * coast.rand(key, b + 1)();
    var seg = coast.segmentAt(p0);
    if (seg.type === "beach") f(p0, Math.min(p1, seg.x1), seg, r);
  }
}

// Sand ends fade out towards the rocky ends of a bay.
function bayFade(t) {
  return Math.min(1, Math.sin(Math.PI * t) * 3);
}

/** Height of the dune crest above the dune line at x (hummocks at two scales). */
function hummock(x, s) {
  return -s * (16 + 12 * Noise.z(x * 0.006, 7.7) + 5 * Noise.z(x * 0.03, 2.2));
}

/** A tuft of dune grass: blades fanning up from (x, y); spread is the fan angle in radians. */
export function tuft(x, y, size, spread = 1.6) {
  var canv = [];
  var blades = 4 + Math.floor(random() * 6);
  for (var i = 0; i < blades; i++) {
    var ang = -Math.PI / 2 + (random() - 0.5) * spread;
    var len = size * (0.5 + random());
    var bend = (random() - 0.5) * 0.6;
    var pts = [];
    for (var k = 0; k <= 4; k++) {
      var u = k / 4;
      var a = ang + bend * u;
      pts.push([x + Math.cos(a) * len * u + (random() - 0.5) * 0.4, y + Math.sin(a) * len * u]);
    }
    canv.push(
      ...stroke(pts, {
        col: tone("foliage", (0.3 + 0.3 * random()).toFixed(3)),
        wid: 0.5 + 0.4 * size * 0.08,
        fun: (t) => 1 - t, // thick at the base, fine at the tip
      }),
    );
  }
  return canv;
}

/**
 * @param {number} x0
 * @param {number} x1
 * @param {ReturnType<typeof import("../world/coast.js").createCoast>} coast
 */
export function beach(x0, x1, coast) {
  var canv = [];

  // Dune line and its face.
  eachPiece(x0, x1, coast, "dune", function (p0, p1, seg, r) {
    var line = [];
    for (var x = p0; x <= p1; x += 4) {
      var a = coast.at(x);
      line.push([x, a.dune + hummock(x, nearness(a, coast.H))]);
    }
    if (line.length < 3) return;
    var s0 = nearness(coast.at((p0 + p1) / 2), coast.H);
    if (r() < 0.95) {
      canv.push(...stroke(line, { col: tone("sand", (0.3 + 0.2 * r()).toFixed(3)), wid: 1.5 + 2.5 * s0, noi: 0.6 }));
    }
    // volume: short slanted hatching down the face, just below the crest
    for (var hch = 0; hch < 10 * s0; hch++) {
      var q = line[Math.floor(r() * line.length)];
      var hl = s0 * (6 + 14 * r());
      var lean = 0.3 + 0.4 * r();
      canv.push(
        ...stroke(
          [
            [q[0], q[1] + 3],
            [q[0] + hl * lean * 0.5, q[1] + 3 + hl * 0.5],
            [q[0] + hl * lean, q[1] + 3 + hl],
          ],
          { col: tone("sand", (0.08 + 0.1 * r()).toFixed(3)), wid: 0.6 + 0.6 * s0 },
        ),
      );
    }
    // soft ridges sweeping down the dune face
    for (var k = 0; k < 2; k++) {
      if (r() < 0.5) continue;
      var drop = s0 * (10 + 40 * r());
      canv.push(
        ...stroke(
          line.map((p, i) => [p[0], p[1] + drop + 4 * Math.sin(i * 0.5 + k)]),
          { col: tone("sand", (0.06 + 0.08 * r()).toFixed(3)), wid: 0.6 + s0 },
        ),
      );
    }
    // dune grass: clumps where the noise says so, along the crest and down the face
    for (var g = 0; g < 6; g++) {
      var gx = p0 + (p1 - p0) * r();
      if (Noise.noise(gx * 0.008, 3.3) < 0.45) continue;
      var a2 = coast.at(gx);
      var sg = nearness(a2, coast.H);
      var crest = g < 3;
      var gy = a2.dune + hummock(gx, sg) + (crest ? 1 : sg * 60 * r());
      canv.push(...tuft(gx, gy, (crest ? 10 + 16 * sg : 6 + 10 * sg), crest ? 0.9 : 1.6));
    }
  }, DUNE_PIECE);

  // Sand stipple and tide wrack between the swash and the dune.
  eachPiece(x0, x1, coast, "sand", function (p0, p1, seg, r) {
    var mid = coast.at((p0 + p1) / 2);
    var s0 = nearness(mid, coast.H) * bayFade(mid.t);
    var dots = Math.round(10 * s0);
    for (var d = 0; d < dots; d++) {
      var x = p0 + (p1 - p0) * r();
      var a = coast.at(x);
      var y = a.shore + (a.dune - a.shore) * (0.25 + 0.7 * r());
      var len = 1 + 2.5 * r() * s0;
      canv.push(
        ...stroke(
          [
            [x, y],
            [x + len / 2, y + 0.2],
            [x + len, y],
          ],
          { col: tone("sand", (0.1 + 0.15 * r()).toFixed(3)), wid: 0.6 + 0.4 * s0 },
        ),
      );
    }
    // tide wrack: an irregular dotted line about a third of the way up the beach
    if (Noise.noise(p0 * 0.003, 5.5) > 0.45) {
      for (var w = 0; w < 5; w++) {
        var wx = p0 + (p1 - p0) * r();
        var wa = coast.at(wx);
        var wy = wa.shore + (wa.dune - wa.shore) * (0.3 + 0.08 * Noise.noise(wx * 0.02, 1.1));
        var wl = s0 * (6 + 12 * r());
        canv.push(
          ...stroke(
            [
              [wx, wy],
              [wx + wl * 0.3, wy - 0.3 * r()],
              [wx + wl * 0.7, wy + 0.3 * r()],
              [wx + wl, wy],
            ],
            { col: tone("ink", (0.2 + 0.2 * r()).toFixed(3)), wid: 0.8 + 0.8 * s0 },
          ),
        );
      }
    }
  });

  return canv;
}
