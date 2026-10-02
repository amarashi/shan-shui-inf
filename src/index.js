// coast-inf: a seeded, infinitely scrolling Australian coastal landscape in ink.
// A fork of {Shan, Shui}* by Lingdong Huang (MIT).
//
//   import { mount, renderToSVG } from "coast-inf";
//   const scene = mount(document.querySelector("#hero"), { seed: "abc", mode: "drift" });
//   const svg = renderToSVG({ seed: "abc", x0: 0, x1: 3000 }); // Node, no DOM needed
//
// The custom element lives in "coast-inf/element".
export { mount } from "./embed/mount.js";
export { renderToSVG } from "./render/standalone.js";
