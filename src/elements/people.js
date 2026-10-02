// Figures (PLAN.md Phase 4). Upstream's Man.man had one leg chain and read as a robe; these
// have two legs, a shirt and shorts. Small and faceless, as upstream: they read by
// silhouette and clothing only.
//
// person(x, y, { pose, hat, item, size, fli })
//   pose  standing | walking | sitting | carrying | fishing | prone
//   hat   sun | cap | none
//   item  board | rod | towel | bag | none
//   size  height in world units when standing
// (x, y) is the ground (or water surface) under the figure.
import { random } from "../rng.js";
import { blob, stroke } from "../brush.js";
import { poly } from "../render/displaylist.js";
import { body, tone } from "../render/palette.js";

// Joint positions per pose, in units of the standing height, y up (negative is up).
const POSES = {
  standing: () => ({
    footL: [-0.05, 0], footR: [0.05, 0], kneeL: [-0.04, -0.27], kneeR: [0.04, -0.27],
    hip: [0, -0.5], neck: [0, -0.84], head: [0, -0.93],
    elbowL: [-0.09, -0.67], handL: [-0.09, -0.52], elbowR: [0.09, -0.67], handR: [0.09, -0.52],
  }),
  walking: () => {
    var s = 0.08 + 0.06 * random();
    return {
      footL: [-s, 0], footR: [s + 0.02, 0], kneeL: [-s * 0.4, -0.27], kneeR: [s * 0.7, -0.28],
      hip: [0, -0.5], neck: [0.02, -0.84], head: [0.03, -0.93],
      elbowL: [0.06, -0.68], handL: [0.1, -0.55], elbowR: [-0.06, -0.68], handR: [-0.1, -0.56],
    };
  },
  sitting: () => ({
    footL: [0.32, 0], footR: [0.36, -0.01], kneeL: [0.2, -0.27], kneeR: [0.24, -0.25],
    hip: [0, -0.13], neck: [-0.04, -0.47], head: [-0.03, -0.56],
    elbowL: [0.06, -0.3], handL: [0.18, -0.26], elbowR: [-0.12, -0.25], handR: [-0.16, -0.08],
  }),
  carrying: () => {
    var s = 0.07 + 0.05 * random();
    return {
      footL: [-s, 0], footR: [s + 0.02, 0], kneeL: [-s * 0.4, -0.27], kneeR: [s * 0.7, -0.28],
      hip: [0, -0.5], neck: [0.01, -0.84], head: [0.02, -0.93],
      elbowL: [0.04, -0.66], handL: [0.07, -0.54], elbowR: [0.1, -0.66], handR: [0.12, -0.52],
    };
  },
  fishing: () => ({
    footL: [-0.07, 0], footR: [0.07, 0], kneeL: [-0.05, -0.27], kneeR: [0.06, -0.27],
    hip: [0, -0.5], neck: [0.02, -0.84], head: [0.04, -0.93],
    elbowL: [0.08, -0.68], handL: [0.17, -0.64], elbowR: [0.12, -0.7], handR: [0.19, -0.7],
  }),
  prone: () => ({
    footL: [-0.5, -0.02], footR: [-0.48, -0.04], kneeL: [-0.3, -0.03], kneeR: [-0.29, -0.05],
    hip: [-0.12, -0.05], neck: [0.2, -0.07], head: [0.28, -0.11],
    elbowL: [0.27, 0.0], handL: [0.36, 0.06], elbowR: [0.24, -0.02], handR: [0.31, 0.05],
  }),
};

export const POSE_NAMES = Object.keys(POSES);

/** Resample a polyline to n evenly spaced points. */
function along(pts, n) {
  var segs = [];
  var total = 0;
  for (var i = 1; i < pts.length; i++) {
    var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  var out = [];
  for (var k = 0; k < n; k++) {
    var t = (total * k) / (n - 1);
    var j = 0;
    while (j < segs.length - 1 && t > segs[j]) {
      t -= segs[j];
      j++;
    }
    var f = segs[j] ? Math.min(1, t / segs[j]) : 0;
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
  }
  return out;
}

/** A limb of even width (ends rounded off a little). */
function limb(pts, col, wid) {
  return stroke(along(pts, 8), { col: col, wid: wid, noi: 0.2, fun: (t) => 0.75 + 0.25 * Math.sin(Math.PI * t) });
}

export function person(x, y, args) {
  args = args || {};
  var H = args.size || 16;
  var pose = args.pose || "standing";
  var hat = args.hat || "none";
  var item = args.item || "none";
  var dir = args.fli ? -1 : 1;
  var j = POSES[pose]();
  var P = (k) => [x + dir * j[k][0] * H, y + j[k][1] * H];
  var canv = [];
  var cloth = (a) => tone("cloth", a);
  var skin = (a) => tone("ink", a);

  // items behind the figure
  if (item === "board" && pose === "prone") canv.push(...board(x - dir * 0.08 * H, y + 0.02 * H, 1.15 * H, 0.03, dir));
  if (item === "towel" && pose === "sitting") {
    canv.push(...poly([[x - 0.3 * H, y + 0.03 * H], [x + 0.55 * H, y + 0.02 * H], [x + 0.5 * H, y - 0.06 * H], [x - 0.25 * H, y - 0.05 * H]].map((p) => [x + (p[0] - x) * dir, p[1]]), { fil: body("cloth"), str: cloth(0.35), wid: 0.6 }));
  }

  // legs: shorts above the knee, bare below
  for (var side of ["L", "R"]) {
    var hip = P("hip");
    var knee = P("knee" + side);
    var foot = P("foot" + side);
    var mid = [(hip[0] + knee[0]) / 2, (hip[1] + knee[1]) / 2];
    canv.push(...limb([knee, foot], skin(0.45), 0.035 * H));
    canv.push(...limb([hip, mid, [mid[0] * 0.25 + knee[0] * 0.75, mid[1] * 0.25 + knee[1] * 0.75]], cloth(0.55), 0.06 * H));
  }

  // shirt
  var h = P("hip");
  var n = P("neck");
  var ang = Math.atan2(n[1] - h[1], n[0] - h[0]) + Math.PI / 2;
  var wS = 0.085 * H;
  var wH = 0.07 * H;
  var shirt = [
    [h[0] + Math.cos(ang) * wH, h[1] + Math.sin(ang) * wH],
    [n[0] + Math.cos(ang) * wS, n[1] + Math.sin(ang) * wS],
    [n[0] - Math.cos(ang) * wS, n[1] - Math.sin(ang) * wS],
    [h[0] - Math.cos(ang) * wH, h[1] - Math.sin(ang) * wH],
  ];
  canv.push(...poly(shirt, { fil: body("cloth"), str: cloth(0.55), wid: Math.max(0.5, 0.03 * H) }));

  // arms: sleeve to the elbow, forearm bare
  for (var side2 of ["L", "R"]) {
    var e = P("elbow" + side2);
    var hd = P("hand" + side2);
    canv.push(...limb([e, hd], skin(0.45), 0.028 * H));
    canv.push(...limb([n, e], cloth(0.5), 0.04 * H));
  }

  // head
  var hp = P("head");
  canv.push(...blob(hp[0], hp[1], { len: 0.13 * H, wid: 0.12 * H, ang: Math.PI / 2, col: skin(0.35), noi: 0.2 }));

  // hat
  if (hat === "sun") {
    canv.push(...stroke([[hp[0] - 0.13 * H, hp[1] - 0.02 * H], [hp[0], hp[1] - 0.05 * H], [hp[0] + 0.13 * H, hp[1] - 0.02 * H]], { col: cloth(0.6), wid: 0.025 * H }));
    canv.push(...blob(hp[0], hp[1] - 0.07 * H, { len: 0.11 * H, wid: 0.06 * H, ang: 0, col: cloth(0.5), noi: 0.2 }));
  } else if (hat === "cap") {
    canv.push(...blob(hp[0], hp[1] - 0.04 * H, { len: 0.12 * H, wid: 0.06 * H, ang: 0, col: cloth(0.55), noi: 0.2 }));
    canv.push(...limb([[hp[0], hp[1] - 0.03 * H], [hp[0] + dir * 0.12 * H, hp[1] - 0.02 * H]], cloth(0.55), 0.02 * H));
  }

  // items in front
  if (item === "board" && pose !== "prone") {
    var hr = P("handR");
    canv.push(...board(hr[0] - dir * 0.05 * H, hr[1] + 0.02 * H, 1.05 * H, pose === "carrying" ? -0.25 : -1.45, dir));
  }
  if (item === "rod") {
    var hr2 = P("handR");
    var tip = [hr2[0] + dir * 1.1 * H, hr2[1] - 0.75 * H];
    canv.push(...stroke(along([hr2, [(hr2[0] + tip[0]) / 2, (hr2[1] + tip[1]) / 2 - 0.05 * H], tip], 8), { col: skin(0.6), wid: 0.015 * H + 0.3, fun: (t) => 1 - 0.7 * t }));
    var lineEnd = [tip[0] + dir * 0.3 * H, y + 0.5 * H];
    canv.push(...stroke([tip, [(tip[0] + lineEnd[0]) / 2 + dir * 0.1 * H, (tip[1] + lineEnd[1]) / 2], lineEnd], { col: skin(0.2), wid: 0.3, fun: () => 1 }));
  }
  if (item === "bag") {
    var hl = P("handL");
    canv.push(...poly([[hl[0] - 0.05 * H, hl[1]], [hl[0] + 0.05 * H, hl[1]], [hl[0] + 0.06 * H, hl[1] + 0.12 * H], [hl[0] - 0.06 * H, hl[1] + 0.12 * H]], { fil: body("cloth"), str: cloth(0.5), wid: 0.5 }));
  }
  if (item === "towel" && pose !== "sitting") {
    var nn = P("neck");
    canv.push(...limb([[nn[0] - dir * 0.05 * H, nn[1]], [nn[0] - dir * 0.09 * H, nn[1] + 0.2 * H]], cloth(0.4), 0.05 * H));
  }
  return canv;
}

/** A surfboard: a long narrow lens centred on (x, y), tilted by ang radians. */
function board(x, y, len, ang, dir) {
  var pts = [];
  for (var k = 0; k <= 16; k++) {
    var a = (k / 16) * Math.PI * 2;
    var lx = Math.cos(a) * len * 0.5;
    var ly = Math.sin(a) * len * 0.07 * (Math.cos(a) > 0 ? 0.8 : 1); // pointed nose
    var c = Math.cos(ang * dir);
    var s = Math.sin(ang * dir);
    pts.push([x + dir * (lx * c - ly * s), y + lx * s + ly * c]);
  }
  return poly(pts, { fil: body("structure"), str: tone("structure", 0.5), wid: Math.max(0.5, len * 0.02) });
}
