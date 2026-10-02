// Upstream water: a few clusters of wave strokes under each mountain.
import { random } from "../rng.js";
import { stroke } from "../brush.js";
import { Noise } from "../noise.js";
import { poly } from "../render/displaylist.js";
import { body, NONE, tone } from "../render/palette.js";

  export function water(xoff, yoff, seed, args) {
    var args = args != undefined ? args : {};
    var hei = args.hei != undefined ? args.hei : 2;
    var len = args.len != undefined ? args.len : 800;
    var clu = args.clu != undefined ? args.clu : 10;
    var canv = [];

    var ptlist = [];
    var yk = 0;
    for (var i = 0; i < clu; i++) {
      ptlist.push([]);
      var xk = (random() - 0.5) * (len / 8);
      yk += random() * 5;
      var lk = len / 4 + random() * (len / 4);
      var reso = 5;
      for (var j = -lk; j < lk; j += reso) {
        ptlist[ptlist.length - 1].push([
          j + xk,
          Math.sin(j * 0.2) * hei * Noise.noise(j * 0.1) - 20 + yk,
        ]);
      }
    }

    for (var j = 1; j < ptlist.length; j += 1) {
      canv.push(...stroke(
        ptlist[j].map(function(x) {
          return [x[0] + xoff, x[1] + yoff];
        }),
        {
          col:
            tone("water", (0.3 + random() * 0.3).toFixed(3)),
          wid: 1,
        },
      ));
    }

    return canv;
  }

/**
 * Swell lines between the horizon and the shore (PLAN.md 3.2, sea).
 * Line k of n sits at y = yh + (ref - yh) * (k/n)^2, so spacing opens towards the viewer.
 * ref is a fixed depth bent only 30% towards the local shore: rows stay roughly parallel to
 * the horizon and end where they meet the waterline, instead of all squeezing into the thin
 * strip of sea in front of a headland. Each line is a run of brushed dashes whose length,
 * wobble, width and opacity grow towards the viewer. Dashes start inside [x0, x1), so
 * chunks join without seams.
 * @param {number} x0
 * @param {number} x1
 * @param {{at: (x: number) => {shore: number, yh: number}}} coast
 */
export function swell(x0, x1, coast) {
  var canv = [];
  var n = 18;
  var REF = 0.8 * coast.H; // the depth the rows are spaced against
  var yAt = function (x, t) {
    var a = coast.at(x);
    var ref = REF + 0.3 * (a.shore - REF);
    return a.yh + (ref - a.yh) * t;
  };
  for (var k = 0; k < n; k++) {
    var t = Math.pow(k / n, 2); // 0 at the horizon
    var near = k / n; // 0 far, ~1 near
    var x = x0 + random() * 40 * (0.3 + near);
    // far rows are faint and broken, so the horizon reads as distance, not a dark band
    var keep = 0.55 + 0.45 * near;
    while (x < x1) {
      var len = 30 + 160 * near * (0.5 + random());
      var gap = len * (0.15 + 0.9 * random()) + 6;
      var phase = random() * 6.283;
      var amp = 0.4 + 3 * near;
      var pts = [];
      for (var u = 0; u <= len; u += 6) {
        var px = x + u;
        var py = yAt(px, t) + amp * Math.sin(px * (0.06 - 0.03 * near) + phase);
        // keep clear of the waterline
        if (py > coast.at(px).shore - 8) break;
        pts.push([px, py]);
      }
      if (pts.length > 3 && random() < keep) {
        canv.push(
          ...stroke(pts, {
            col: tone("water", (0.08 + 0.14 * near + 0.3 * near * random()).toFixed(3)),
            wid: k == 0 ? 0.6 : 0.6 + 1.8 * near,
          }),
        );
      }
      x += len + gap;
    }
  }
  return canv;
}

// Nearness at x: 0 at the horizon, 1 at the bottom of the picture. Sizes scale with it.
function nearness(a, H) {
  return (a.shore - a.yh) / (H - a.yh);
}

// Fade surf and swash out towards the rocky ends of a bay.
function bayFade(t) {
  return Math.min(1, Math.sin(Math.PI * t) * 3);
}

/**
 * Breaking waves (PLAN.md 3.2, surf): 2 to 4 lines per beach following the shoreline, each
 * broken into runs (waves break in sections). A run has a foam body with an irregular top
 * edge, a darker shadow stroke under the lip and a few trailing streaks behind it.
 * Run boundaries come from noise over global x, and a run is drawn by the chunk where it
 * starts, so runs never break at chunk edges.
 */
export function surf(x0, x1, coast) {
  var canv = [];
  var STEP = 3;
  for (var seg of coast.segmentsIn(x0, x1)) {
    if (seg.type !== "beach") continue;
    var r = coast.rand("surf", seg.index);
    var lines = 2 + Math.floor(r() * 3);
    for (var j = 0; j < lines; j++) {
      var back = (45 + 70 * j) * (0.8 + 0.4 * r()); // distance seaward of the shore, at nearness 1
      var phase = r() * 1000;
      var cut = 0.42 + 0.03 * j; // outer lines break into shorter runs
      var on = function (x) {
        var a = coast.at(x);
        // runs stop well before the rocky ends of the bay, where the water is too shallow
        return a.segment === seg && bayFade(a.t) > 0.6 && Noise.noise(x * 0.004 + phase) > cut;
      };
      var start = Math.ceil(Math.max(x0, seg.x0) / STEP) * STEP;
      for (var x = start; x < Math.min(x1, seg.x1); x += STEP) {
        if (!on(x) || on(x - STEP)) continue; // only where a run starts
        var run = [];
        for (var u = x; on(u) && u < x + 900; u += STEP) run.push(u);
        if (run.length < 4) continue;
        canv.push(...breaker(run, back, j, coast));
      }
    }
  }
  return canv;
}

function breaker(run, back, j, coast) {
  var canv = [];
  var n = run.length;
  var lip = [];
  for (var q = 0; q < n; q++) {
    var x = run[q];
    var a = coast.at(x);
    lip.push([x, a.shore - back * nearness(a, coast.H)]);
  }
  var sMid = nearness(coast.at(run[n >> 1]), coast.H);

  // Foam top: a chain of rounded bumps, like the cauliflower edge of breaking foam.
  // Bumps are tallest mid-run and shrink to nothing at both ends.
  var top = [];
  var q0 = 0;
  while (q0 < n - 1) {
    var w = 4 + Math.floor(random() * random() * 9); // bump width in samples: mostly small, some broad (narrower ones draw as spikes)
    var q1 = Math.min(n - 1, q0 + w);
    var end = Math.pow(Math.sin((Math.PI * (q0 + q1 + 1)) / (2 * n)), 0.6);
    var hb = sMid * end * (14 + 24 * Noise.noise(run[q0] * 0.03, j * 3.1)) * (0.6 + 0.4 * random());
    for (var qq = q0; qq <= q1; qq++) {
      var f = (qq - q0) / (q1 - q0);
      top.push([lip[qq][0], lip[qq][1] - hb * (0.55 + 0.45 * Math.pow(Math.sin(Math.PI * f), 0.45 + 0.4 * random()))]);
    }
    q0 = q1 - (q1 - q0 > 3 && random() < 0.4 ? 1 : 0); // bumps sometimes overlap
  }

  // foam body: hides the swell lines behind it
  canv.push(...poly(top.concat(lip.slice().reverse()), { fil: body("foam"), str: NONE }));
  // the bumpy top edge
  canv.push(...stroke(top, { col: tone("foam", (0.22 + 0.15 * random()).toFixed(3)), wid: 0.8 + 0.5 * sMid, noi: 0.7 }));
  // a few faint curls inside the foam
  for (var c = 0; c < n / 10; c++) {
    var i0 = Math.floor(random() * (n - 3));
    var i1 = Math.min(n - 1, i0 + 2 + Math.floor(random() * 5));
    var depth = 0.3 + 0.5 * random();
    canv.push(
      ...stroke(
        top.slice(i0, i1 + 1).map((p, k) => [p[0], p[1] + (lip[i0 + k][1] - p[1]) * depth]),
        { col: tone("foam", (0.08 + 0.1 * random()).toFixed(3)), wid: 0.6 },
      ),
    );
  }
  // the steep face of the wave under the lip, in shadow: a few darker strokes
  var faces = 2 + Math.floor(3 * sMid);
  for (var f2 = 0; f2 < faces; f2++) {
    var dy = 2 + f2 * (2 + 4 * sMid);
    var from = Math.floor(random() * n * 0.25);
    var to = n - Math.floor(random() * n * 0.25);
    canv.push(
      ...stroke(
        lip.slice(from, to).map((p) => [p[0], p[1] + dy]),
        { col: tone("water", ((0.42 - 0.1 * f2) * (0.7 + 0.3 * random())).toFixed(3)), wid: (0.8 + 2.2 * sMid) / (1 + 0.5 * f2) },
      ),
    );
  }
  // trailing foam streaks behind the wave
  for (var k2 = 0; k2 < n / 12; k2++) {
    var j0 = Math.floor(random() * n);
    var j1 = Math.min(n - 1, j0 + 4 + Math.floor(random() * 10));
    var lift = sMid * (6 + 14 * random());
    canv.push(
      ...stroke(
        top.slice(j0, j1 + 1).map((p) => [p[0], p[1] - lift]),
        { col: tone("foam", (0.1 + 0.12 * random()).toFixed(3)), wid: 0.6 },
      ),
    );
  }
  return canv;
}

/**
 * The swash (PLAN.md 3.2): a lobed foam edge where the last of each wave runs up the sand,
 * a thin darker band of wet sand behind it and a faint reflection strip. Drawn in pieces
 * whose boundaries sit on a global lattice; a piece belongs to the chunk where it starts.
 */
export function swash(x0, x1, coast) {
  var canv = [];
  var PIECE = 64;
  for (var b = Math.ceil(x0 / PIECE); b * PIECE < x1; b++) {
    var r = coast.rand("swash", b);
    var p0 = b * PIECE + 12 * r();
    var p1 = (b + 1) * PIECE + 12 * coast.rand("swash", b + 1)();
    var seg = coast.segmentAt(p0);
    if (seg.type !== "beach") continue;
    var edge = [];
    var water = [];
    for (var x = p0; x <= p1 && x < seg.x1; x += 2) {
      var a = coast.at(x);
      var s = nearness(a, coast.H) * bayFade(a.t);
      // lobes: scallops of foam bulging up the sand
      var lobe = s * (2 + 4 * Math.abs(Math.sin((x + 300 * r()) / 16)));
      edge.push([x, a.shore + lobe]);
      water.push([x, a.shore - 1]);
    }
    if (edge.length < 3) continue;
    var s0 = nearness(coast.at((p0 + p1) / 2), coast.H);
    canv.push(...poly(water.concat(edge.slice().reverse()), { fil: body("foam"), str: NONE }));
    canv.push(...stroke(edge, { col: tone("foam", (0.25 + 0.15 * r()).toFixed(3)), wid: 0.7 + 0.8 * s0, noi: 0.6 }));
    // wet sand: short darker dabs just behind the foam edge
    for (var d = 0; d < 6 * s0 + 1; d++) {
      var e = edge[Math.floor(random() * edge.length)];
      var dy = s0 * (3 + 9 * random());
      var len = 3 + 8 * random() * s0;
      canv.push(
        ...stroke(
          [
            [e[0], e[1] + dy],
            [e[0] + len / 2, e[1] + dy + 0.3],
            [e[0] + len, e[1] + dy],
          ],
          { col: tone("sand", (0.12 + 0.12 * random()).toFixed(3)), wid: 0.6 + 0.6 * s0 },
        ),
      );
    }
    // reflection strip: a faint line just behind the swash
    if (random() < 0.5) {
      canv.push(
        ...stroke(
          edge.map((q) => [q[0], q[1] + s0 * 6]),
          { col: tone("water", (0.05 + 0.06 * random()).toFixed(3)), wid: 0.5 + s0 },
        ),
      );
    }
  }
  return canv;
}
