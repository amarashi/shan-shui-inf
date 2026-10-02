// Coastal flora (PLAN.md Phase 4): gum, heath, banksia, casuarina, Norfolk Island pine,
// grass tree and dune grass. Built from upstream's brush primitives (stroke, blob) so they
// share its hand-drawn quality. Each takes a base point (x, y) on the ground.
import { random } from "../rng.js";
import { blob, stroke } from "../brush.js";
import { poly } from "../render/displaylist.js";
import { body, tone } from "../render/palette.js";
import { tuft } from "./beach.js";

/**
 * A tapered limb around a polyline: its outline polygon and its two sides.
 * @param {number[][]} pts
 * @param {number} w0 width at the start
 * @param {number} w1 width at the end
 */
function taper(pts, w0, w1) {
  var left = [];
  var right = [];
  for (var i = 0; i < pts.length; i++) {
    var a = pts[Math.max(0, i - 1)];
    var b = pts[Math.min(pts.length - 1, i + 1)];
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    var w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    left.push([pts[i][0] + Math.cos(ang) * w, pts[i][1] + Math.sin(ang) * w]);
    right.push([pts[i][0] - Math.cos(ang) * w, pts[i][1] - Math.sin(ang) * w]);
  }
  return { outline: left.concat(right.slice().reverse()), left: left, right: right };
}

/** Draw a limb as a pale body with two ink sides. */
function drawLimb(canv, pts, w0, w1, ink) {
  var t = taper(pts, w0, w1);
  canv.push(...poly(t.outline, { fil: body("trunk"), str: body("trunk"), wid: 0 }));
  canv.push(...stroke(t.left, { col: tone("trunk", ink), wid: 0.6 + w0 * 0.05, noi: 0.5 }));
  canv.push(...stroke(t.right, { col: tone("trunk", (ink * 0.8).toFixed(3)), wid: 0.6 + w0 * 0.05, noi: 0.5 }));
}

/** A slightly curving limb from (x, y) at angle ang. */
function limbPoints(x, y, ang, len, wobble, lift) {
  var pts = [[x, y]];
  var a = ang;
  for (var i = 1; i <= 6; i++) {
    // drift randomly, and turn a little towards straight up (ascending branches)
    a += (random() - 0.5) * wobble + lift * (-Math.PI / 2 - a) * 0.15;
    x += (Math.cos(a) * len) / 6;
    y += (Math.sin(a) * len) / 6;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Eucalypt: pale smooth trunk, sparse bark blotches, often leaning or forked, ascending
 * branches, and pendant sickle leaves in separate clumps with sky between them.
 */
export function gum(x, y, args) {
  args = args || {};
  var hei = args.hei || 120;
  var canv = [];
  var leaves = [];
  var maxDepth = 3 + (random() < 0.4 ? 1 : 0);
  var lean = (random() - 0.5) * 0.4;

  function branch(bx, by, ang, len, wid, depth) {
    var pts = limbPoints(bx, by, ang, len, 0.25, depth === 0 ? 0.3 : 0.8);
    drawLimb(canv, pts, wid, wid * 0.65, (0.35 + 0.15 * random()).toFixed(3));
    if (depth <= 1) {
      for (var k = 0; k < 1 + 3 * random(); k++) {
        var p = pts[1 + Math.floor(random() * (pts.length - 2))];
        canv.push(...blob(p[0], p[1], { len: wid * (0.4 + 0.6 * random()), wid: wid * 0.3, ang: ang, col: tone("trunk", (0.1 + 0.1 * random()).toFixed(3)) }));
      }
    }
    var end = pts[pts.length - 1];
    if (depth >= maxDepth) {
      leaves.push(end);
      return;
    }
    var kids = random() < 0.3 ? 3 : 2;
    for (var c = 0; c < kids; c++) {
      var spread = (0.25 + 0.4 * random()) * (c % 2 ? 1 : -1) * (c === 2 ? 0.3 : 1);
      var from = c === 2 ? pts[4] : end;
      branch(from[0], from[1], ang + spread, len * (0.62 + 0.16 * random()), wid * 0.62, depth + 1);
    }
  }
  branch(x, y, -Math.PI / 2 + lean, hei * 0.42, hei * 0.07, 0);

  // pendant leaf clumps
  for (var l = 0; l < leaves.length; l++) {
    var c0 = leaves[l];
    var n = 8 + Math.floor(12 * random());
    var R = hei * (0.08 + 0.06 * random());
    for (var j = 0; j < n; j++) {
      var a = random() * Math.PI * 2;
      var d = R * Math.sqrt(random());
      var lx = c0[0] + Math.cos(a) * d;
      var ly = c0[1] + Math.sin(a) * d * 0.7 + R * 0.3; // hang below the twig end
      canv.push(
        ...blob(lx, ly, {
          len: hei * (0.05 + 0.04 * random()),
          wid: hei * (0.012 + 0.01 * random()),
          ang: Math.PI / 2 + (random() - 0.5) * 1.1,
          col: tone("foliage", (0.3 + 0.25 * random()).toFixed(3)),
        }),
      );
    }
  }
  return canv;
}

/** Low rounded coastal heath: a dense dome of small leaves. */
export function heath(x, y, args) {
  args = args || {};
  var size = args.size || 20;
  var tall = args.tall || 0.8; // dome height as a fraction of size
  var canv = [];
  var n = Math.round(size * 2.2);
  for (var i = 0; i < n; i++) {
    var u = random() * 2 - 1;
    var h = Math.sqrt(1 - u * u) * size * tall; // dome
    var bx = x + u * size;
    var by = y - h * Math.sqrt(random()); // more leaves towards the top edge
    canv.push(
      ...blob(bx, by, {
        len: 2 + 3 * random() * (size / 20),
        wid: 1.2 + 1.5 * random() * (size / 20),
        ang: random() * Math.PI,
        col: tone("foliage", (0.3 + 0.3 * random()).toFixed(3)),
      }),
    );
  }
  canv.push(...stroke([[x - size, y], [x, y + 1], [x + size, y]], { col: tone("foliage", 0.25), wid: 1.2 }));
  return canv;
}
/** Banksia: taller scrub with a few upright flower cones. */
export function banksia(x, y, args) {
  args = args || {};
  var size = args.size || 26;
  var canv = [];
  // stems, mostly hidden by the foliage drawn over them
  for (var s = 0; s < 3; s++) {
    var sx = x + (random() - 0.5) * size * 0.3;
    canv.push(...stroke([[sx, y], [sx + (random() - 0.5) * 4, y - size * 0.5], [sx + (random() - 0.5) * 8, y - size]], { col: tone("trunk", 0.4), wid: 1.4 }));
  }
  canv.push(...heath(x, y, { size: size, tall: 1.3 }));
  // flower cones: short upright cylinders
  for (var c = 0; c < 2 + 4 * random(); c++) {
    var cx = x + (random() - 0.5) * size * 1.2;
    var cy = y - size * (0.5 + 0.7 * random());
    canv.push(...blob(cx, cy, { len: size * 0.3, wid: size * 0.13, ang: -Math.PI / 2 + (random() - 0.5) * 0.3, col: tone("foliage", (0.6 + 0.2 * random()).toFixed(3)), noi: 0.2 }));
    canv.push(...stroke([[cx, cy + size * 0.15], [cx, cy + size * 0.25]], { col: tone("trunk", 0.4), wid: 1 }));
  }
  return canv;
}
/** Casuarina (she-oak): thin dark trunk, wispy drooping strands of needles. */
export function casuarina(x, y, args) {
  args = args || {};
  var hei = args.hei || 90;
  var canv = [];
  var trunk = limbPoints(x, y, -Math.PI / 2 + (random() - 0.5) * 0.3, hei * 0.8, 0.15, 0.2);
  var t = taper(trunk, hei * 0.05, hei * 0.02);
  canv.push(...poly(t.outline, { fil: tone("trunk", 0.45), str: tone("trunk", 0.45), wid: 0 }));
  for (var b = 0; b < 4 + 4 * random(); b++) {
    var p = trunk[2 + Math.floor(random() * (trunk.length - 2))];
    var dir = random() < 0.5 ? -1 : 1;
    var br = limbPoints(p[0], p[1], -Math.PI / 2 + dir * (0.5 + 0.5 * random()), hei * (0.15 + 0.2 * random()), 0.3, 0.3);
    canv.push(...stroke(br, { col: tone("trunk", 0.4), wid: 1.2, fun: (u) => 1 - u }));
    // drooping strands from along the branch
    for (var s = 0; s < 8 + 12 * random(); s++) {
      var q = br[Math.floor(random() * br.length)];
      var len = hei * (0.12 + 0.2 * random());
      var out = dir * (0.2 + 0.5 * random());
      var strand = [];
      for (var k = 0; k <= 5; k++) {
        var u = k / 5;
        strand.push([q[0] + out * len * u, q[1] + len * u * u * 0.9 - len * 0.1 * u]);
      }
      canv.push(...stroke(strand, { col: tone("foliage", (0.2 + 0.2 * random()).toFixed(3)), wid: 0.6, fun: (u) => 1 - u * 0.7 }));
    }
  }
  return canv;
}

/** Norfolk Island pine: straight trunk and symmetric tiers of whorled branches. */
export function norfolkPine(x, y, args) {
  args = args || {};
  var hei = args.hei || 170;
  var canv = [];
  var trunk = [];
  for (var i = 0; i <= 8; i++) trunk.push([x + (random() - 0.5) * 0.6, y - (hei * i) / 8]);
  drawLimb(canv, trunk, hei * 0.035, hei * 0.004, 0.4);
  var tiers = 7 + Math.floor(4 * random());
  for (var k = 0; k < tiers; k++) {
    var f = k / (tiers - 1);
    var ty = y - hei * (0.22 + 0.76 * Math.pow(f, 0.85));
    var L = hei * (0.3 * (1 - f) + 0.04);
    for (var side of [-1, 1]) {
      var L2 = L * (0.85 + 0.3 * random());
      var at = (u) => [x + side * L2 * u, ty + L2 * 0.08 * Math.sin(Math.PI * u) - L2 * 0.1 * u * u];
      var br = [0, 0.25, 0.5, 0.75, 1].map(at);
      // the frond: a fringe of fine needle strokes hanging from the branch
      var needles = Math.round(10 + 20 * (1 - f));
      for (var q = 0; q < needles; q++) {
        var u = random();
        var p = at(u);
        var nl = (3 + 7 * (1 - f)) * (0.6 + 0.6 * random());
        var lean = side * (0.3 + 0.4 * random());
        canv.push(
          ...stroke(
            [p, [p[0] + lean * nl * 0.3, p[1] + nl * 0.35], [p[0] + lean * nl * 0.6, p[1] + nl * 0.7], [p[0] + lean * nl * 0.8, p[1] + nl]],
            { col: tone("foliage", (0.25 + 0.25 * random()).toFixed(3)), wid: 0.5 + 0.4 * (1 - f), fun: (t) => 1 - t * 0.6 },
          ),
        );
      }
      canv.push(...stroke(br, { col: tone("trunk", 0.4), wid: 0.8 + 1.2 * (1 - f), fun: (t) => 1 - 0.7 * t }));
      canv.push(...stroke(br.map((pt) => [pt[0], pt[1] + 3 + 3 * (1 - f)]), { col: tone("foliage", 0.18), wid: 2 + 3 * (1 - f) }));
    }
  }
  return canv;
}
/** Grass tree: blackened trunk, a fountain of fine grass, a tall flower spike. */
export function grassTree(x, y, args) {
  args = args || {};
  var hei = args.hei || 50;
  var canv = [];
  var top = [x + (random() - 0.5) * hei * 0.1, y - hei * (0.25 + 0.3 * random())];
  var t = taper([[x, y], [(x + top[0]) / 2, (y + top[1]) / 2], top], hei * 0.16, hei * 0.13);
  canv.push(...poly(t.outline, { fil: tone("trunk", 0.5), str: tone("trunk", 0.5), wid: 0 }));
  // charred bark: short dark dabs on the trunk
  for (var d = 0; d < 6; d++) {
    var v = random();
    var px = x + (top[0] - x) * v + (random() - 0.5) * hei * 0.1;
    var py = y + (top[1] - y) * v;
    canv.push(...blob(px, py, { len: hei * 0.06, wid: hei * 0.03, ang: random(), col: tone("trunk", 0.35) }));
  }
  // flower spike
  var sp = hei * (0.9 + 0.6 * random());
  var sx = top[0] + (random() - 0.5) * 6;
  canv.push(...stroke([top, [sx, top[1] - sp * 0.5], [sx + 1, top[1] - sp]], { col: tone("trunk", 0.5), wid: 1.2, fun: () => 1 }));
  canv.push(...blob(sx + 0.5, top[1] - sp * 0.72, { len: sp * 0.5, wid: 3, ang: -Math.PI / 2, col: tone("trunk", 0.5) }));
  // the skirt: a fountain of fine grass that stops at the ground
  var n = 40 + Math.floor(30 * random());
  for (var i = 0; i < n; i++) {
    var a = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.6;
    var L = hei * (0.3 + 0.3 * random());
    var droop = 0.3 + 0.9 * Math.abs(Math.cos(a));
    var pts = [];
    for (var k = 0; k <= 6; k++) {
      var u = k / 6;
      var py2 = top[1] + Math.sin(a) * L * u + droop * L * u * u;
      if (py2 > y - 1) break;
      pts.push([top[0] + Math.cos(a) * L * u, py2]);
    }
    if (pts.length > 2) canv.push(...stroke(pts, { col: tone("foliage", (0.2 + 0.25 * random()).toFixed(3)), wid: 0.5, fun: (u) => 1 - u * 0.8 }));
  }
  return canv;
}
/** Dune grass: a few tufts. */
export function duneGrass(x, y, args) {
  args = args || {};
  var size = args.size || 14;
  var canv = [];
  for (var i = 0; i < 1 + 3 * random(); i++) {
    canv.push(...tuft(x + (random() - 0.5) * size * 1.5, y + (random() - 0.5) * 3, size * (0.6 + 0.6 * random()), 1.1));
  }
  return canv;
}
