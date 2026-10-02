// PolyTools and numeric utilities from upstream.
import { random } from "./rng.js";

  export const PolyTools = new function() {
    this.midPt = function() {
      var plist =
        arguments.length == 1 ? arguments[0] : Array.apply(null, arguments);
      return plist.reduce(
        function(acc, v) {
          /*       if (v == undefined || acc == undefined){
        console.log("ERRR");
        console.log(plist)
        return [0,0]
      } */
          return [v[0] / plist.length + acc[0], v[1] / plist.length + acc[1]];
        },
        [0, 0],
      );
    };
    this.triangulate = function(plist, args) {
      //return []
      var args = args != undefined ? args : {};
      var area = args.area != undefined ? args.area : 100;
      var convex = args.convex != undefined ? args.convex : false;
      var optimize = args.optimize != undefined ? args.optimize : true;
      function lineExpr(pt0, pt1) {
        var den = pt1[0] - pt0[0];
        var m = den == 0 ? Infinity : (pt1[1] - pt0[1]) / den;
        var k = pt0[1] - m * pt0[0];
        return [m, k];
      }
      function intersect(ln0, ln1) {
        var le0 = lineExpr(...ln0);
        var le1 = lineExpr(...ln1);
        var den = le0[0] - le1[0];
        if (den == 0) {
          return false;
        }
        var x = (le1[1] - le0[1]) / den;
        var y = le0[0] * x + le0[1];
        function onSeg(p, ln) {
          //non-inclusive
          return (
            Math.min(ln[0][0], ln[1][0]) <= p[0] &&
            p[0] <= Math.max(ln[0][0], ln[1][0]) &&
            Math.min(ln[0][1], ln[1][1]) <= p[1] &&
            p[1] <= Math.max(ln[0][1], ln[1][1])
          );
        }
        if (onSeg([x, y], ln0) && onSeg([x, y], ln1)) {
          return [x, y];
        }
        return false;
      }
      function ptInPoly(pt, plist) {
        var scount = 0;
        for (var i = 0; i < plist.length; i++) {
          var np = plist[i != plist.length - 1 ? i + 1 : 0];
          var sect = intersect(
            [plist[i], np],
            [pt, [pt[0] + 999, pt[1] + 999]],
          );
          if (sect != false) {
            scount++;
          }
        }
        return scount % 2 == 1;
      }
      function lnInPoly(ln, plist) {
        var lnc = [[0, 0], [0, 0]];
        var ep = 0.01;

        lnc[0][0] = ln[0][0] * (1 - ep) + ln[1][0] * ep;
        lnc[0][1] = ln[0][1] * (1 - ep) + ln[1][1] * ep;
        lnc[1][0] = ln[0][0] * ep + ln[1][0] * (1 - ep);
        lnc[1][1] = ln[0][1] * ep + ln[1][1] * (1 - ep);

        for (var i = 0; i < plist.length; i++) {
          var pt = plist[i];
          var np = plist[i != plist.length - 1 ? i + 1 : 0];
          if (intersect(lnc, [pt, np]) != false) {
            return false;
          }
        }
        var mid = PolyTools.midPt(ln);
        if (ptInPoly(mid, plist) == false) {
          return false;
        }
        return true;
      }

      function sidesOf(plist) {
        var slist = [];
        for (var i = 0; i < plist.length; i++) {
          var pt = plist[i];
          var np = plist[i != plist.length - 1 ? i + 1 : 0];
          var s = Math.sqrt(
            Math.pow(np[0] - pt[0], 2) + Math.pow(np[1] - pt[1], 2),
          );
          slist.push(s);
        }
        return slist;
      }
      function areaOf(plist) {
        var slist = sidesOf(plist);
        var a = slist[0],
          b = slist[1],
          c = slist[2];
        var s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
      }
      function sliverRatio(plist) {
        var A = areaOf(plist);
        var P = sidesOf(plist).reduce(function(m, n) {
          return m + n;
        }, 0);
        return A / P;
      }
      function bestEar(plist) {
        var cuts = [];
        for (var i = 0; i < plist.length; i++) {
          var pt = plist[i];
          var lp = plist[i != 0 ? i - 1 : plist.length - 1];
          var np = plist[i != plist.length - 1 ? i + 1 : 0];
          var qlist = plist.slice();
          qlist.splice(i, 1);
          if (convex || lnInPoly([lp, np], plist)) {
            var c = [[lp, pt, np], qlist];
            if (!optimize) return c;
            cuts.push(c);
          }
        }
        var best = [plist, []];
        var bestRatio = 0;
        for (var i = 0; i < cuts.length; i++) {
          var r = sliverRatio(cuts[i][0]);
          if (r >= bestRatio) {
            best = cuts[i];
            bestRatio = r;
          }
        }
        return best;
      }
      function shatter(plist, a) {
        if (plist.length == 0) {
          return [];
        }
        // !(area >= a), not area < a: for very flat triangles Heron's formula can give
        // NaN (a tiny negative under the root), and upstream then recursed forever.
        if (!(areaOf(plist) >= a)) {
          return [plist];
        } else {
          var slist = sidesOf(plist);
          var ind = slist.reduce(
            (iMax, x, i, arr) => (x > arr[iMax] ? i : iMax),
            0,
          );
          var nind = (ind + 1) % plist.length;
          var lind = (ind + 2) % plist.length;
          try {
            var mid = PolyTools.midPt([plist[ind], plist[nind]]);
          } catch (err) {
            console.log(plist);
            console.log(err);
            return [];
          }
          return shatter([plist[ind], mid, plist[lind]], a).concat(
            shatter([plist[lind], plist[nind], mid], a),
          );
        }
      }
      if (plist.length <= 3) {
        return shatter(plist, area);
      } else {
        var cut = bestEar(plist);
        return shatter(cut[0], area).concat(
          PolyTools.triangulate(cut[1], args),
        );
      }
    };
  }();

  export function unNan(plist) {
    if (typeof plist != "object" || plist == null) {
      return plist || 0;
    } else {
      return plist.map(unNan);
    }
  }

  export function distance(p0, p1) {
    return Math.sqrt(Math.pow(p0[0] - p1[0], 2) + Math.pow(p0[1] - p1[1], 2));
  }

  export function mapval(value, istart, istop, ostart, ostop) {
    return (
      ostart + (ostop - ostart) * (((value - istart) * 1.0) / (istop - istart))
    );
  }
  export function loopNoise(nslist) {
    var dif = nslist[nslist.length - 1] - nslist[0];
    var bds = [100, -100];
    for (var i = 0; i < nslist.length; i++) {
      nslist[i] += (dif * (nslist.length - 1 - i)) / (nslist.length - 1);
      if (nslist[i] < bds[0]) bds[0] = nslist[i];
      if (nslist[i] > bds[1]) bds[1] = nslist[i];
    }
    for (var i = 0; i < nslist.length; i++) {
      nslist[i] = mapval(nslist[i], bds[0], bds[1], 0, 1);
    }
  }

  export function randChoice(arr) {
    return arr[Math.floor(arr.length * random())];
  }

  export function normRand(m, M) {
    return mapval(random(), 0, 1, m, M);
  }

  export function wtrand(func) {
    var x = random();
    var y = random();
    if (y < func(x)) {
      return x;
    } else {
      return wtrand(func);
    }
  }

  export function randGaussian() {
    return (
      wtrand(function(x) {
        return Math.pow(Math.E, -24 * Math.pow(x - 0.5, 2));
      }) *
        2 -
      1
    );
  }

  export function bezmh(P, w) {
    w = w == undefined ? 1 : w;
    if (P.length == 2) {
      P = [P[0], PolyTools.midPt(P[0], P[1]), P[1]];
    }
    var plist = [];
    for (var j = 0; j < P.length - 2; j++) {
      var p0;
      var p1;
      var p2;
      if (j == 0) {
        p0 = P[j];
      } else {
        p0 = PolyTools.midPt(P[j], P[j + 1]);
      }
      p1 = P[j + 1];
      if (j == P.length - 3) {
        p2 = P[j + 2];
      } else {
        p2 = PolyTools.midPt(P[j + 1], P[j + 2]);
      }
      var pl = 20;
      for (var i = 0; i < pl + (j == P.length - 3); i += 1) {
        var t = i / pl;
        var u = Math.pow(1 - t, 2) + 2 * t * (1 - t) * w + t * t;
        plist.push([
          (Math.pow(1 - t, 2) * p0[0] +
            2 * t * (1 - t) * p1[0] * w +
            t * t * p2[0]) /
            u,
          (Math.pow(1 - t, 2) * p0[1] +
            2 * t * (1 - t) * p1[1] * w +
            t * t * p2[1]) /
            u,
        ]);
      }
    }
    return plist;
  }
