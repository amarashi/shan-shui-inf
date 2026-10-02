// A sandstone headland (PLAN.md 3.2): an asymmetric mesa between two bays.
//
//   silhouette  rises from the bay waterline on each flank to a plateau 70 to 150 units
//               above the water. One flank is a steep cliff, the other a gentler slope.
//   body        filled down to the bottom of the picture, widening towards the viewer,
//               so it hides the sea, sand and dunes behind it.
//   face        sandstone strata: near-horizontal bedding strokes with a slight dip,
//               vertical joints, and a dark undercut just above the water.
//   foot        talus boulders, and a rock platform with foam below the steep flank.
//   top         heath (upstream tree02 scrub for now; Phase 4 brings coastal flora).
import { random } from "../rng.js";
import { stroke, texture } from "../brush.js";
import { Noise } from "../noise.js";
import { poly } from "../render/displaylist.js";
import { body, NONE, tone } from "../render/palette.js";
import { Tree } from "./flora.js";
import { Mount } from "./terrain.js";

function smooth(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

/**
 * A headland's shape parameters, from its own stream (shared with the stacks layer).
 * @param {{x0: number, x1: number, index: number}} seg
 */
export function headlandParams(seg, coast) {
  var r = coast.rand("headland", seg.index);
  return {
    r: r,
    rise: 70 + 80 * r(), // plateau height above the waterline
    steepRight: r() < 0.5,
    steep: 0.05 + 0.04 * r(), // flank widths as fractions of the width
    gentle: 0.22 + 0.12 * r(),
  };
}

/**
 * @param {{x0: number, x1: number, index: number}} seg a headland segment
 * @param {ReturnType<typeof import("../world/coast.js").createCoast>} coast
 */
export function headland(seg, coast) {
  var canv = [];
  var hp = headlandParams(seg, coast);
  var r = hp.r;
  var w = seg.x1 - seg.x0;
  var xc = (seg.x0 + seg.x1) / 2;
  var rise = hp.rise;
  var steepRight = hp.steepRight;
  var steep = hp.steep;
  var gentle = hp.gentle;
  var bL = steepRight ? gentle : steep;
  var bR = steepRight ? steep : gentle;
  var spill = 0.07 * w; // the flanks reach a little into the bays
  var dip = (r() - 0.5) * 0.06; // strata dip

  // Waterline under the headland and its flanks (the bays' shore beyond the segment).
  var foot = (x) => coast.at(x).shore;

  // Silhouette.
  var top = [];
  for (var x = seg.x0 - spill; x <= seg.x1 + spill; x += 4) {
    var u = (x - seg.x0) / w;
    var p = smooth((u + 0.07) / (bL + 0.07)) * smooth((1.07 - u) / (bR + 0.07));
    var plateau = 1 + 0.06 * Noise.z(x * 0.01, seg.index) + 0.02 * Noise.z(x * 0.06, seg.index);
    var yf = foot(x);
    top.push([x, yf - rise * p * plateau]);
  }
  var x0n = seg.x0 - spill - 0.12 * w;
  var x1n = seg.x1 + spill + 0.12 * w;

  // Body: hides everything behind it.
  canv.push(...poly(top.concat([[x1n, coast.H], [x0n, coast.H]]), { fil: body("rock"), str: NONE }));

  // The near slope, from the waterline down towards the viewer: upstream's contour
  // texture over rows that widen from the flank feet to the bottom of the picture.
  var ROWS = 8;
  var COLS = 40;
  var xl0 = top[0][0];
  var xr0 = top[top.length - 1][0];
  var rows = [];
  for (var ri = 0; ri <= ROWS; ri++) {
    var g = ri / ROWS;
    var row = [];
    for (var ci = 0; ci <= COLS; ci++) {
      var cu = ci / COLS;
      var rx = (xl0 + (x0n - xl0) * g) * (1 - cu) + (xr0 + (x1n - xr0) * g) * cu;
      var ry0 = foot(rx) + 6;
      row.push([rx, ry0 + (coast.H - ry0) * Math.pow(g, 1.3)]);
    }
    rows.push(row);
  }
  canv.push(
    ...texture(rows, {
      tex: 70,
      wid: 1.5,
      len: 0.25,
      role: "foliage",
      col: () => tone("foliage", (0.06 + 0.16 * random()).toFixed(3)),
    }),
  );
  // scattered scrub on the slope, denser near the cliff
  for (var sc = 0; sc < w / 25; sc++) {
    var g2 = Math.pow(random(), 1.8);
    var row2 = rows[Math.min(ROWS, Math.round(g2 * ROWS))];
    var sp = row2[Math.floor(random() * row2.length)];
    canv.push(...Tree.tree02(sp[0], sp[1], { col: tone("foliage", (0.3 + 0.2 * random()).toFixed(3)), clu: 2 + Math.floor(3 * random()), hei: 6 + 14 * g2, wid: 4 + 8 * g2 }));
  }

  // Sandstone strata on the face, from the top down to the waterline.
  var layers = 7 + Math.floor(5 * r());
  var fs = [];
  for (var l0 = 1; l0 < layers; l0++) fs.push((l0 + (r() - 0.5) * 0.8) / layers);
  for (var l = 1; l < layers; l++) {
    var f = fs[l - 1];
    var run = [];
    for (var i = 0; i < top.length; i++) {
      var tx = top[i][0];
      var yf2 = foot(tx);
      var h = yf2 - top[i][1];
      if (h < 8) {
        flush();
        continue;
      }
      var y = top[i][1] + h * f + dip * (tx - xc) * f + 1.5 * Noise.z(tx * 0.03, l);
      if (y > yf2 - 2) {
        flush();
        continue;
      }
      run.push([tx, y]);
      // break the bedding into lengths, like weathered sandstone
      if (run.length > 4 && random() < 0.14) flush();
      if (run.length === 0 && random() < 0.25) i += 2 + Math.floor(random() * 6); // gaps
    }
    flush();
  }
  function flush() {
    if (run.length > 3) {
      canv.push(...stroke(run, { col: tone("rock", (0.12 + 0.18 * random()).toFixed(3)), wid: 0.8 + 1.2 * random(), noi: 0.6 }));
    }
    run = [];
  }

  // Vertical joints.
  for (var jn = 0; jn < w / 40; jn++) {
    var q = top[Math.floor(random() * top.length)];
    var hq = foot(q[0]) - q[1];
    if (hq < 20) continue;
    var a0 = q[1] + hq * (0.05 + 0.3 * random());
    var a1 = a0 + hq * (0.15 + 0.35 * random());
    canv.push(
      ...stroke(
        [
          [q[0], a0],
          [q[0] + (random() - 0.5) * 2, (a0 + a1) / 2],
          [q[0] + (random() - 0.5) * 3, a1],
        ],
        { col: tone("rock", (0.12 + 0.15 * random()).toFixed(3)), wid: 0.7 + 0.8 * random() },
      ),
    );
  }

  // Undercut: a dark notch just above the water.
  var notch = [];
  for (var i2 = 0; i2 < top.length; i2++) {
    var nx = top[i2][0];
    var yw = foot(nx);
    if (yw - top[i2][1] < 25) {
      if (notch.length > 4) canv.push(...undercut(notch));
      notch = [];
      continue;
    }
    notch.push([nx, yw - 3 - 2 * random()]);
  }
  if (notch.length > 4) canv.push(...undercut(notch));

  // Outline of the silhouette, as upstream's mountains.
  canv.push(...stroke(top, { col: tone("rock", 0.35), noi: 1, wid: 3 }));

  // Talus at the foot of each flank.
  for (var side of [seg.x0, seg.x1]) {
    for (var t2 = 0; t2 < 2 + 3 * random(); t2++) {
      var tx2 = side + (random() - 0.5) * 0.15 * w;
      canv.push(...Mount.rock(tx2, foot(tx2) + 4 + 6 * random(), random() * 100, { wid: 8 + 14 * random(), hei: 6 + 10 * random(), sha: 2 }));
    }
  }

  // Rock platform with foam below the steep flank.
  var px = steepRight ? seg.x1 - steep * w * 0.5 : seg.x0 + steep * w * 0.5;
  var plen = 40 + 60 * random();
  var plat = [];
  var pdir = steepRight ? 1 : -1;
  for (var k = 0; k <= 10; k++) {
    var xx = px + pdir * plen * (k / 10);
    plat.push([xx, foot(xx) + 1 + 2 * Math.sin(k)]);
  }
  var platTop = plat.map((pt) => [pt[0], pt[1] - 3]);
  canv.push(...poly(platTop.concat(plat.slice().reverse()), { fil: body("rock"), str: NONE }));
  canv.push(...stroke(platTop, { col: tone("rock", 0.3), wid: 1.2 }));
  canv.push(...stroke(plat.map((pt) => [pt[0], pt[1] - 5]), { col: tone("foam", 0.2), wid: 0.8 }));

  // Heath along the plateau.
  for (var hx = seg.x0; hx < seg.x1; hx += 6 + 14 * random()) {
    var ti = Math.round((hx - top[0][0]) / 4);
    if (ti < 0 || ti >= top.length) continue;
    if (foot(hx) - top[ti][1] < rise * 0.6) continue; // only on the plateau
    canv.push(...Tree.tree02(hx, top[ti][1] + 3, { col: tone("foliage", (0.4 + 0.2 * random()).toFixed(3)), clu: 2 + Math.floor(3 * random()), hei: 8, wid: 5 }));
  }

  return canv;
}

function undercut(pts) {
  var canv = [];
  canv.push(...stroke(pts, { col: tone("rock", (0.35 + 0.15 * random()).toFixed(3)), wid: 2 + 1.5 * random(), noi: 0.8 }));
  canv.push(...stroke(pts.map((p) => [p[0], p[1] - 3]), { col: tone("rock", 0.15), wid: 1 }));
  return canv;
}

/**
 * Sea stacks off the steep flank of a headland with the "stacks" variant.
 */
export function stacks(seg, coast) {
  var canv = [];
  var hp = headlandParams(seg, coast);
  var r = coast.rand("stacks", seg.index);
  var n = 1 + Math.floor(3 * r());
  var dir = hp.steepRight ? 1 : -1;
  var edge = hp.steepRight ? seg.x1 : seg.x0;
  for (var i = 0; i < n; i++) {
    var x = edge + dir * (30 + 140 * r());
    var a = coast.at(x);
    var y = a.yh + (a.shore - a.yh) * (0.35 + 0.4 * r());
    var s = (y - a.yh) / (coast.H - a.yh);
    var hei = (60 + 90 * r()) * (0.4 + s);
    var wid = (14 + 22 * r()) * (0.4 + s);
    // a tall rock: upstream's rock() stretched upwards
    canv.push(...Mount.rock(x, y, r() * 100, { wid: wid, hei: hei, sha: 3, tex: 30 }));
    // bedding lines across the stack
    for (var b = 1; b < 4; b++) {
      var by = y - hei * 0.85 * (b / 4);
      canv.push(...stroke([[x - wid * 0.5, by], [x, by + 1], [x + wid * 0.5, by]], { col: tone("rock", 0.15), wid: 0.8 }));
    }
    // foam around the base
    var foam = [];
    for (var k = 0; k <= 8; k++) foam.push([x - wid * 1.1 + (wid * 2.2 * k) / 8, y + 1 + 1.5 * Math.sin(k * 1.7)]);
    canv.push(...poly(foam.concat(foam.map((p) => [p[0], p[1] - 4]).reverse()), { fil: body("foam"), str: NONE }));
    canv.push(...stroke(foam.map((p) => [p[0], p[1] - 4]), { col: tone("foam", 0.25), wid: 0.8 }));
  }
  return canv;
}
