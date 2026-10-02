// Upstream water: a few clusters of wave strokes under each mountain.
import { random } from "../rng.js";
import { stroke } from "../brush.js";
import { Noise } from "../noise.js";
import { tone } from "../render/palette.js";

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
