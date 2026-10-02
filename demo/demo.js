// Demo page: a drifting hero painting with controls, and a second <coast-inf> element.
import { mount } from "../src/index.js";
import "../src/embed/element.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

let options = {
  seed: params.get("seed") || undefined,
  mode: params.get("mode") || "drift",
  scene: params.get("scene") || "coast",
  height: Math.round(Math.min(420, Math.max(220, innerWidth * 0.38))),
};
let scene = mount($("hero"), options);

function show() {
  $("seed").value = scene.seed;
  $("mode").value = options.mode;
  $("scene").value = options.scene;
  const url = new URL(location.href);
  url.searchParams.set("seed", scene.seed);
  url.searchParams.set("mode", options.mode);
  url.searchParams.set("scene", options.scene);
  history.replaceState(null, "", url);
}
show();

function remount() {
  scene.destroy();
  options = { ...options, seed: scene.seed };
  scene = mount($("hero"), options);
  show();
}

$("new").addEventListener("click", () => scene.reseed().then(show) && show());
$("go").addEventListener("click", () => {
  const s = $("seed").value.trim();
  if (s) scene.reseed(s).then(show) && show();
});
$("seed").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("go").click();
});
$("mode").addEventListener("change", (e) => {
  options.mode = e.target.value;
  remount();
});
$("scene").addEventListener("change", (e) => {
  options.scene = e.target.value;
  remount();
});
$("download").addEventListener("click", () => {
  const blob = new Blob([scene.toSVG()], { type: "image/svg+xml" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `coast-${scene.seed}.svg` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// for tools and tests
window.demo = { get scene() { return scene; } };
