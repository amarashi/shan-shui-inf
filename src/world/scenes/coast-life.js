// Placement of flora, structures, boats and people on the coast (PLAN.md Phase 4).
//
//   near       foreground flora behind the dunes and on headland slopes (sparse)
//   life       per beach: kiosk, flags with swimmers, walkers along the swash, people on
//              towels, surfers beyond the breakers, a shack or boat shed, sometimes a jetty
//   landmarks  per headland: lighthouse on the plateau, ocean pool and fishers on the platform
//   boats      sailing boats far out, dinghies near the shore, only in front of beaches
//
// Every decision comes from a coast.rand stream keyed by the chunk, beach or headland, and
// records sit at their ground y so nearer things paint over further ones.
import { boatShed, dinghy, flags, jetty, kiosk, lighthouse, oceanPool, sailboat, shack } from "../../elements/buildings.js";
import { headlandParams, headlandTop } from "../../elements/headland.js";
import { banksia, casuarina, grassTree, gum, heath, norfolkPine } from "../../elements/natives.js";
import { person } from "../../elements/people.js";
import { CHUNK } from "../plan.js";
import { DEPTH, registerCoastLayer } from "./coast-registry.js";

/** Nearness at picture y: 0 at the horizon, 1 at the bottom. */
function near(coast, y) {
  return Math.max(0.05, (y - coast.yh) / (coast.H - coast.yh));
}

/** Segments of this type whose centre lies in chunk k (each is planned exactly once). */
function ownedSegments(coast, k, type) {
  return coast.segmentsIn(k * CHUNK - 1500, (k + 1) * CHUNK + 1500).filter(function (seg) {
    var xc = (seg.x0 + seg.x1) / 2;
    return seg.type === type && xc >= k * CHUNK && xc < (k + 1) * CHUNK;
  });
}

const pick = (r, list) => list[Math.floor(r() * list.length)];

// --- near: foreground flora ---------------------------------------------------------
const NEAR_DRAW = {
  heath: (r) => heath(r.x, r.y, { size: r.size }),
  banksia: (r) => banksia(r.x, r.y, { size: r.size }),
  grassTree: (r) => grassTree(r.x, r.y, { hei: r.size }),
  casuarina: (r) => casuarina(r.x, r.y, { hei: r.size }),
  gum: (r) => gum(r.x, r.y, { hei: r.size }),
  norfolkPine: (r) => norfolkPine(r.x, r.y, { hei: r.size }),
};


const HATS = ["sun", "cap", "none", "none"];

/** Register the Phase 4 layers (called by coast.js after the landscape layers). */
export function registerLifeLayers() {
  registerCoastLayer({
    name: "near",
    plan: function (k, ctx) {
      var coast = ctx.coast;
      var r = coast.rand("near", k);
      var out = [];
      var n = 3 + Math.floor(5 * r());
      for (var q = 0; q < n; q++) {
        var x = k * CHUNK + CHUNK * r();
        var a = coast.at(x);
        var u = r();
        if (a.segment.type === "beach") {
          if (a.t < 0.04 || a.t > 0.96) continue;
          var y = a.dune + (coast.H - a.dune) * (0.12 + 0.85 * u);
          var s = near(coast, y);
          var deep = (y - a.dune) / (coast.H - a.dune); // how far behind the dune line
          var kind = pick(r, ["heath", "heath", "heath", "banksia", "banksia", "grassTree", "casuarina", deep > 0.5 ? "gum" : "heath"]);
          var size = { heath: 12 + 24 * s, banksia: 14 + 26 * s, grassTree: 18 + 40 * s, casuarina: 50 + 110 * s, gum: 90 + 170 * s }[kind];
          out.push({ tag: "near", x: x, y: y, kind: kind, size: size * (0.8 + 0.4 * r()) });
        } else {
          // the near slope of a headland, away from the flanks
          if (a.t < 0.2 || a.t > 0.8) continue;
          var y2 = a.shore + (coast.H - a.shore) * (0.15 + 0.8 * u);
          var s2 = near(coast, y2);
          var kind2 = pick(r, ["heath", "heath", "banksia", "grassTree", "gum"]);
          var size2 = { heath: 12 + 24 * s2, banksia: 14 + 26 * s2, grassTree: 18 + 40 * s2, gum: 80 + 150 * s2 }[kind2];
          out.push({ tag: "near", x: x, y: y2, kind: kind2, size: size2 * (0.8 + 0.4 * r()) });
        }
      }
      // a row of Norfolk Island pines behind some beaches, as at town beaches
      for (var seg of ownedSegments(coast, k, "beach")) {
        var rr = coast.rand("pines", seg.index);
        if (rr() > 0.3) continue;
        var w = seg.x1 - seg.x0;
        var from = seg.x0 + w * (0.15 + 0.2 * rr());
        var to = seg.x1 - w * (0.15 + 0.2 * rr());
        for (var px = from; px < to; px += 90 + 60 * rr()) {
          var pa = coast.at(px);
          var py = pa.dune + (coast.H - pa.dune) * (0.15 + 0.1 * rr());
          out.push({ tag: "near", x: px, y: py, kind: "norfolkPine", size: (120 + 150 * near(coast, py)) * (0.85 + 0.3 * rr()) });
        }
      }
      return out;
    },
    draw: (r) => [{ y: r.y, list: NEAR_DRAW[r.kind](r) }],
  });

  // --- life: beach structures and people ------------------------------------------------

  registerCoastLayer({
    name: "life",
    plan: function (k, ctx) {
      var coast = ctx.coast;
      var out = [];
      for (var seg of ownedSegments(coast, k, "beach")) {
        var r = coast.rand("life", seg.index);
        var w = seg.x1 - seg.x0;
        var at = (t) => coast.at(seg.x0 + w * t);
        var sandY = (a, f) => a.shore + (a.dune - a.shore) * f;
        // kiosk at the back of the beach
        if (r() < 0.45) {
          var a = at(0.3 + 0.4 * r());
          var y = a.dune + 4;
          out.push({ tag: "life", kind: "kiosk", x: seg.x0 + w * a.t, y: y, size: 30 + 60 * near(coast, y) });
        }
        // flags with swimmers between them
        if (r() < 0.55) {
          var af = at(0.35 + 0.3 * r());
          var fy = sandY(af, 0.3);
          var fs = near(coast, fy);
          var gap = 50 + 90 * fs;
          var fx = seg.x0 + w * af.t;
          out.push({ tag: "life", kind: "flags", x: fx, y: fy, gap: gap, size: 8 + 16 * fs });
          for (var sw = 0; sw < 2 + 4 * r(); sw++) {
            var sx = fx + (r() - 0.5) * gap * 0.8;
            var sa = coast.at(sx);
            var swy = sa.shore - 2 - 10 * near(coast, sa.shore) * r();
            out.push({ tag: "life", kind: "person", x: sx, y: swy, size: 6 + 18 * near(coast, swy), pose: "standing", hat: "none", item: "none", fli: r() < 0.5 });
          }
        }
        // walkers along the swash
        for (var wk = 0; wk < 2 + 5 * r(); wk++) {
          var aw = at(0.1 + 0.8 * r());
          var wy = sandY(aw, 0.05 + 0.12 * r());
          out.push({ tag: "life", kind: "person", x: seg.x0 + w * aw.t, y: wy, size: 6 + 20 * near(coast, wy), pose: r() < 0.25 ? "carrying" : "walking", hat: pick(r, HATS), item: pick(r, ["none", "none", "bag", "towel", "board"]), fli: r() < 0.5 });
        }
        // people on towels
        for (var st = 0; st < 1 + 4 * r(); st++) {
          var as = at(0.15 + 0.7 * r());
          var sy = sandY(as, 0.4 + 0.45 * r());
          out.push({ tag: "life", kind: "person", x: seg.x0 + w * as.t, y: sy, size: 6 + 20 * near(coast, sy), pose: "sitting", hat: pick(r, HATS), item: "towel", fli: r() < 0.5 });
        }
        // surfers beyond the breakers
        for (var sf = 0; sf < 4 * r(); sf++) {
          var au = at(0.2 + 0.6 * r());
          var uy = au.shore - (60 + 80 * r()) * near(coast, au.shore);
          out.push({ tag: "life", kind: "person", x: seg.x0 + w * au.t, y: uy, size: 5 + 16 * near(coast, uy), pose: "prone", hat: "none", item: "board", fli: r() < 0.5 });
        }
        // a shack or boat shed near one end of the bay
        if (r() < 0.35) {
          var end = r() < 0.5 ? 0.1 : 0.9;
          var ab = at(end);
          var by = ab.dune + 2;
          out.push({ tag: "life", kind: r() < 0.5 ? "shack" : "boatShed", x: seg.x0 + w * end, y: by, size: 18 + 34 * near(coast, by) });
        }
        // a jetty from one end of the bay
        if (r() < 0.2) {
          var je = r() < 0.5 ? 0.12 : 0.88;
          var aj = at(je);
          out.push({ tag: "life", kind: "jetty", x: seg.x0 + w * je, y: aj.shore + 2, len: (aj.shore - coast.yh) * 0.22, dir: je < 0.5 ? 1 : -1, near: near(coast, aj.shore) });
        }
      }
      return out;
    },
    draw: function (r) {
      var list;
      if (r.kind === "kiosk") list = kiosk(r.x, r.y, { wid: r.size });
      else if (r.kind === "flags") list = flags(r.x, r.y, { gap: r.gap, hei: r.size });
      else if (r.kind === "shack") list = shack(r.x, r.y, { wid: r.size });
      else if (r.kind === "boatShed") list = boatShed(r.x, r.y, { wid: r.size });
      else if (r.kind === "jetty") list = jetty(r.x, r.y, { len: r.len, dir: r.dir, near: r.near });
      else list = person(r.x, r.y, { size: r.size, pose: r.pose, hat: r.hat, item: r.item, fli: r.fli });
      return [{ y: r.y, list: list }];
    },
  });

  // --- landmarks: lighthouse, ocean pool, fishers --------------------------------------
  registerCoastLayer({
    name: "landmarks",
    plan: function (k, ctx) {
      var coast = ctx.coast;
      var out = [];
      for (var seg of ownedSegments(coast, k, "headland")) {
        var r = coast.rand("landmarks", seg.index);
        var hp = headlandParams(seg, coast);
        var w = seg.x1 - seg.x0;
        var dir = hp.steepRight ? -1 : 1; // from the steep edge inwards
        var edge = hp.steepRight ? seg.x1 : seg.x0;
        if (r() < 0.4) {
          var lx = edge + dir * w * (hp.steep + 0.08 + 0.1 * r());
          var ly = headlandTop(seg, coast, lx, hp) + 1;
          out.push({ tag: "landmarks", kind: "lighthouse", x: lx, y: DEPTH.headland + 1, gy: ly, size: 40 + 40 * r() });
        }
        // the platform below the steep flank
        var px = edge + dir * w * hp.steep * 0.5;
        var pdir = -dir;
        if (r() < 0.3) {
          var ox = px + pdir * (20 + 20 * r());
          out.push({ tag: "landmarks", kind: "pool", x: ox, y: DEPTH.headland + 2, gy: coast.at(ox).shore - 1, size: 25 + 20 * r() });
        }
        for (var f = 0; f < 3 * r() - 0.5; f++) {
          var fx = px + pdir * (10 + 50 * r());
          var fy = coast.at(fx).shore - 2;
          out.push({ tag: "landmarks", kind: "fisher", x: fx, y: DEPTH.headland + 3, gy: fy, size: 4 + 10 * near(coast, fy), fli: pdir < 0 });
        }
      }
      return out;
    },
    draw: function (r) {
      var list;
      if (r.kind === "lighthouse") list = lighthouse(r.x, r.gy, { hei: r.size });
      else if (r.kind === "pool") list = oceanPool(r.x, r.gy, { wid: r.size });
      else list = person(r.x, r.gy, { size: r.size, pose: "fishing", hat: "cap", item: "rod", fli: r.fli });
      return [{ y: r.y, list: list }];
    },
  });

  // --- boats ------------------------------------------------------------------------------
  registerCoastLayer({
    name: "boats",
    plan: function (k, ctx) {
      var coast = ctx.coast;
      var r = coast.rand("boats", k);
      var out = [];
      if (r() < 0.3) {
        var x = k * CHUNK + CHUNK * r();
        var a = coast.at(x);
        var y = coast.yh + 4 + 50 * r();
        if (a.segment.type === "beach" && y < a.shore - 15) out.push({ tag: "boats", kind: "sail", x: x, y: y, size: 8 + 40 * near(coast, y) });
      }
      if (r() < 0.12) {
        var x2 = k * CHUNK + CHUNK * r();
        var a2 = coast.at(x2);
        var y2 = a2.shore - (20 + 40 * r()) * near(coast, a2.shore);
        if (a2.segment.type === "beach" && a2.t > 0.15 && a2.t < 0.85) out.push({ tag: "boats", kind: "dinghy", x: x2, y: y2, size: 8 + 24 * near(coast, y2) });
      }
      return out;
    },
    draw: (r) => [{ y: r.y, list: r.kind === "sail" ? sailboat(r.x, r.y, { len: r.size }) : dinghy(r.x, r.y, { len: r.size }) }],
  });
}
