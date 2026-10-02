// <coast-inf> custom element.
//
//   <script type="module">import "coast-inf/element";</script>
//   <coast-inf seed="any string" mode="drift" height="360"></coast-inf>
//
// Attributes: seed, mode (static | scroll | drift), height (pixels), scene (coast | upstream),
// label. Changing seed repaints; changing anything else remounts.
import { mount } from "./mount.js";

const ATTRS = ["seed", "mode", "height", "scene", "label"];

export class CoastInf extends HTMLElement {
  static get observedAttributes() {
    return ATTRS;
  }
  _options() {
    var o = {};
    for (var a of ATTRS) if (this.hasAttribute(a)) o[a] = this.getAttribute(a);
    if (o.height) o.height = Number(o.height);
    return o;
  }
  connectedCallback() {
    // custom elements are inline by default; a painting is a block
    if (!this.style.display && getComputedStyle(this).display === "inline") this.style.display = "block";
    if (!this._scene) this._scene = mount(this, this._options());
  }
  disconnectedCallback() {
    if (this._scene) this._scene.destroy();
    this._scene = null;
  }
  attributeChangedCallback(name, before, after) {
    if (!this._scene || before === after) return;
    if (name === "seed") this._scene.reseed(after);
    else {
      this._scene.destroy();
      this._scene = mount(this, this._options());
    }
  }
  /** The mounted scene (reseed, scrollTo, pause, play, toSVG). */
  get scene() {
    return this._scene;
  }
}

/** Register the element (once) under a tag name, default "coast-inf". */
export function defineCoastInf(tag = "coast-inf") {
  if (!customElements.get(tag)) customElements.define(tag, class extends CoastInf {});
}

defineCoastInf();
