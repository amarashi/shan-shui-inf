// Upstream's page scripts and UI, on the new engine in src/. Until Phase 2 step 3 this page
// reproduced upstream byte for byte; since then each chunk has its own random streams, so
// the same seed gives a different (but scroll-order independent) world from upstream's.
import { withNoise } from "../src/noise.js";
import { paperTexture } from "../src/paper.js";
import { palettes } from "../src/render/palette.js";
import { stream, withRandom } from "../src/rng.js";
import { createWorld } from "../src/world/chunks.js";

// --- seed (upstream parseArgs: the raw text after "seed=", not URL-decoded) ---
// Also ?palette=<name> (not in upstream): ink (default) or roles.
var SEED = "" + new Date().getTime();
var PALETTE = "ink";
var par = window.location.href.split("?")[1];
if (par != undefined) {
  par.split("&").forEach(function (kv) {
    var e = kv.split("=");
    if (e[0] == "seed") SEED = e[1] == "" ? SEED : e[1];
    if (e[0] == "palette" && palettes[e[1]]) PALETTE = e[1];
  });
}
const world = createWorld({ seed: SEED, palette: palettes[PALETTE] });
const MEM = world.MEM;

// --- upstream update(), xcroll() and UI helpers ---
function render() {
  document.getElementById("BG").innerHTML =
    "<svg id='SVG' xmlns='http://www.w3.org/2000/svg' width='" +
    MEM.windx +
    "' height='" +
    MEM.windy +
    "' style='mix-blend-mode:multiply;'" +
    "viewBox = '" +
    world.calcViewBox() +
    "'" +
    "><g id='G' transform='translate(" +
    0 +
    ",0)'>" +
    MEM.canv +
    "</g></svg>";
}
function update() {
  world.update();
  render();
}
function xcroll(v) {
  world.xcroll(v);
  render();
}
function autoxcroll(v) {
  if (document.getElementById("AUTO_SCROLL").checked) {
    xcroll(v);
    setTimeout(function () {
      autoxcroll(v);
    }, 2000);
  }
}
function rstyle(id, b) {
  var a = b ? 0.1 : 0.0;
  document.getElementById(id).setAttribute(
    "style",
    "width: 32px; text-align: center; top: 0px; color:rgba(0,0,0,0.4); display:table;" +
      " cursor: pointer; border: 1px solid rgba(0,0,0,0.4); background-color:rgba(0,0,0," +
      a +
      "); height:" +
      MEM.windy +
      "px",
  );
  document.getElementById(id + ".t").setAttribute("style", "vertical-align:middle; display:table-cell");
}
function toggleVisible(id) {
  var v = document.getElementById(id).style.display == "none";
  document.getElementById(id).style.display = v ? "block" : "none";
}
function toggleText(id, a, b) {
  var v = document.getElementById(id).innerHTML;
  document.getElementById(id).innerHTML = v == "" || v == b ? a : b;
}
var lastScrollX = 0;
var pFrame = 0;
function present() {
  var currScrollX = window.scrollX;
  var step = 1;
  document.body.scrollTo(Math.max(0, pFrame - 10), window.scrollY);
  pFrame += step;
  if (pFrame < 20 || Math.abs(lastScrollX - currScrollX) < step * 2) {
    lastScrollX = currScrollX;
    setTimeout(present, 1);
  }
}
function reloadWSeed(s) {
  var u = window.location.href.split("?")[0];
  window.location.href = u + "?seed=" + s;
}
function downloadSvg() {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(document.getElementById("BG").innerHTML),
  );
  element.setAttribute("download", "shanshui-" + SEED + ".svg");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// The markup uses inline handlers, so these are global. MEM and xcroll are also what
// tools/golden.js reads and calls, as on the upstream page.
Object.assign(window, {
  MEM,
  xcroll,
  autoxcroll,
  rstyle,
  toggleVisible,
  toggleText,
  reloadWSeed,
  downloadSvg,
  btnHoverCol: "rgba(0,0,0,0.1)",
});

for (const id of ["SETTING", "SOURCE_BTN"]) {
  const left = id == "SETTING" ? [4, 40] : [41, 77];
  window.addEventListener("scroll", function () {
    document.getElementById(id).style.left = Math.max(left[0], left[1] - window.scrollX) + "px";
  });
}
rstyle("L", false);
rstyle("R", false);

// --- first screen (upstream's inline script inside #BG) ---
MEM.lasttick = new Date().getTime();
document.getElementById("INP_SEED").value = SEED;
document.getElementById("BG").setAttribute("style", "width:" + MEM.windx + "px");
update();
document.body.scrollTo(0, 0);
present();

// --- paper texture (upstream's last script) ---
var ctx = document.getElementById("bgcanv").getContext("2d");
withNoise(world.noise, function () {
  withRandom(stream(SEED, "paper"), function () {
    paperTexture(function (style, x, y) {
      ctx.fillStyle = style;
      ctx.fillRect(x, y, 1, 1);
    });
  });
});
var img = document.getElementById("bgcanv").toDataURL("image/png");
document.getElementById("BG").style.backgroundImage = "url(" + img + ")";
document.body.style.backgroundImage = "url(" + img + ")";
