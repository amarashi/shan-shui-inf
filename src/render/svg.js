// SVG output. Upstream draws everything through poly(), which returns a <polyline> string.

  export function poly(plist, args) {
    var args = args != undefined ? args : {};
    var xof = args.xof != undefined ? args.xof : 0;
    var yof = args.yof != undefined ? args.yof : 0;
    var fil = args.fil != undefined ? args.fil : "rgba(0,0,0,0)";
    var str = args.str != undefined ? args.str : fil;
    var wid = args.wid != undefined ? args.wid : 0;

    var canv = "<polyline points='";
    for (var i = 0; i < plist.length; i++) {
      canv +=
        " " +
        (plist[i][0] + xof).toFixed(1) +
        "," +
        (plist[i][1] + yof).toFixed(1);
    }
    canv +=
      "' style='fill:" +
      fil +
      ";stroke:" +
      str +
      ";stroke-width:" +
      wid +
      "'/>";
    return canv;
  }
