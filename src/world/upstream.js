// The upstream world: mountplanner, chunkloader and chunkrender, with upstream's global
// MEM turned into per-world state. createWorld() returns an object; nothing is global.
import { random } from "../rng.js";
import { Noise } from "../noise.js";
import { ink } from "../render/palette.js";
import { toSVG } from "../render/svg.js";
import { LAYERS } from "./layers.js";

/** @param {{palette?: {paint: Function}}} [opts] palette defaults to ink (the upstream look) */
export function createWorld(opts = {}) {
  var palette = opts.palette || ink;
  var MEM = {
    canv: "",
    chunks: [],
    xmin: 0,
    xmax: 0,
    cwid: 512,
    cursx: 0,
    lasttick: 0,
    windx: 3000,
    windy: 800,
    planmtx: [],
  };

  function mountplanner(xmin, xmax) {
    function locmax(x, y, f, r) {
      var z0 = f(x, y);
      if (z0 <= 0.3) {
        return false;
      }
      for (var i = x - r; i < x + r; i++) {
        for (var j = y - r; j < y + r; j++) {
          if (f(i, j) > z0) {
            return false;
          }
        }
      }
      return true;
    }

    function chadd(r, mind) {
      mind = mind == undefined ? 10 : mind;
      for (var k = 0; k < reg.length; k++) {
        if (Math.abs(reg[k].x - r.x) < mind) {
          return false;
        }
      }
      reg.push(r);
      return true;
    }

    var reg = [];
    var samp = 0.03;
    var ns = function(x, y) {
      return Math.max(Noise.noise(x * samp) - 0.55, 0) * 2;
    };
    var nns = function(x) {
      return 1 - Noise.noise(x * samp);
    };
    var nnns = function(x, y) {
      return Math.max(Noise.noise(x * samp * 2, 2) - 0.55, 0) * 2;
    };
    var yr = function(x) {
      return Noise.noise(x * 0.01, Math.PI);
    };

    var xstep = 5;
    var mwid = 200;
    for (var i = xmin; i < xmax; i += xstep) {
      var i1 = Math.floor(i / xstep);
      MEM.planmtx[i1] = MEM.planmtx[i1] || 0;
    }

    for (var i = xmin; i < xmax; i += xstep) {
      for (var j = 0; j < yr(i) * 480; j += 30) {
        if (locmax(i, j, ns, 2)) {
          var xof = i + 2 * (random() - 0.5) * 500;
          var yof = j + 300;
          var r = { tag: "mount", x: xof, y: yof, h: ns(i, j) };
          var res = chadd(r);
          if (res) {
            for (
              var k = Math.floor((xof - mwid) / xstep);
              k < (xof + mwid) / xstep;
              k++
            ) {
              MEM.planmtx[k] += 1;
            }
          }
        }
      }
      if (Math.abs(i) % 1000 < Math.max(1, xstep - 1)) {
        var r = {
          tag: "distmount",
          x: i,
          y: 280 - random() * 50,
          h: ns(i, j),
        };
        chadd(r);
      }
    }
    for (var i = xmin; i < xmax; i += xstep) {
      if (MEM.planmtx[Math.floor(i / xstep)] == 0) {
        //var r = {tag:"redcirc",x:i,y:700}
        //console.log(i)
        if (random() < 0.01) {
          for (var j = 0; j < 4 * random(); j++) {
            var r = {
              tag: "flatmount",
              x: i + 2 * (random() - 0.5) * 700,
              y: 700 - j * 50,
              h: ns(i, j),
            };
            chadd(r);
          }
        }
      } else {
        // var r = {tag:"greencirc",x:i,y:700}
        // chadd(r)
      }
    }

    for (var i = xmin; i < xmax; i += xstep) {
      if (random() < 0.2) {
        var r = { tag: "boat", x: i, y: 300 + random() * 390 };
        chadd(r, 400);
      }
    }

    return reg;
  }

  function chunkloader(xmin, xmax) {
    var add = function(nch) {
      // Each chunk keeps its display list and is rendered to markup once, here. (Upstream
      // also replaced any "NaN" in the markup with -1000. No generator produces NaN;
      // test/no-nan.test.js guards it.)
      nch.canv = toSVG(nch.list, palette);
      if (MEM.chunks.length == 0) {
        MEM.chunks.push(nch);
        return;
      } else {
        if (nch.y <= MEM.chunks[0].y) {
          MEM.chunks.unshift(nch);
          return;
        } else if (nch.y >= MEM.chunks[MEM.chunks.length - 1].y) {
          MEM.chunks.push(nch);
          return;
        } else {
          for (var j = 0; j < MEM.chunks.length - 1; j++) {
            if (MEM.chunks[j].y <= nch.y && nch.y <= MEM.chunks[j + 1].y) {
              MEM.chunks.splice(j + 1, 0, nch);
              return;
            }
          }
        }
      }
    };

    while (xmax > MEM.xmax - MEM.cwid || xmin < MEM.xmin + MEM.cwid) {
      var plan;
      if (xmax > MEM.xmax - MEM.cwid) {
        plan = mountplanner(MEM.xmax, MEM.xmax + MEM.cwid);
        MEM.xmax = MEM.xmax + MEM.cwid;
      } else {
        plan = mountplanner(MEM.xmin - MEM.cwid, MEM.xmin);
        MEM.xmin = MEM.xmin - MEM.cwid;
      }

      for (var i = 0; i < plan.length; i++) {
        var layer = LAYERS[plan[i].tag];
        if (!layer) continue;
        var parts = layer.draw(plan[i], i);
        for (var k = 0; k < parts.length; k++) {
          add({ tag: plan[i].tag, x: plan[i].x, y: parts[k].y, list: parts[k].list });
        }
      }
    }
  }

  function chunkrender(xmin, xmax) {
    MEM.canv = "";

    for (var i = 0; i < MEM.chunks.length; i++) {
      if (
        xmin - MEM.cwid < MEM.chunks[i].x &&
        MEM.chunks[i].x < xmax + MEM.cwid
      ) {
        MEM.canv += MEM.chunks[i].canv;
      }
    }
  }

  // From upstream update() and xcroll(), without the DOM. needupdate() always returned
  // true, so every scroll step reloads and re-renders.
  function update() {
    chunkloader(MEM.cursx, MEM.cursx + MEM.windx);
    chunkrender(MEM.cursx, MEM.cursx + MEM.windx);
  }
  function xcroll(v) {
    MEM.cursx += v;
    update();
  }
  // From upstream calcViewBox().
  function calcViewBox() {
    var zoom = 1.142;
    return "" + MEM.cursx + " 0 " + MEM.windx / zoom + " " + MEM.windy / zoom;
  }

  return { MEM, update, xcroll, calcViewBox };
}
