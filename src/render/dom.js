// Keep an SVG group in sync with a list of parts, touching only what changed.
//
// Upstream rebuilt the whole SVG with innerHTML on every scroll step. Here each part
// (one drawn record: a mountain, its water, a boat) is its own <g>, created once from its
// markup. sync() removes parts that left, inserts parts that arrived at their place in
// paint order, and leaves the rest alone.
//
// One <g> per part rather than per chunk: paint order interleaves parts of different
// chunks (a far mountain of chunk 3 is behind a near boat of chunk 2).
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {SVGGElement} root the group to fill
 * @returns {{sync: (parts: {id: string, canv: string}[]) => void, size: () => number}}
 */
export function createPartView(root) {
  /** @type {Map<string, SVGGElement>} */
  var nodes = new Map();

  function sync(parts) {
    var keep = new Set();
    var prev = null;
    for (var i = 0; i < parts.length; i++) {
      var id = parts[i].id;
      keep.add(id);
      var node = nodes.get(id);
      if (!node) {
        node = document.createElementNS(SVG_NS, "g");
        node.setAttribute("data-part", id);
        node.innerHTML = parts[i].canv;
        nodes.set(id, node);
      }
      var want = prev ? prev.nextSibling : root.firstChild;
      if (node !== want) root.insertBefore(node, want);
      prev = node;
    }
    for (var [id2, node2] of nodes) {
      if (!keep.has(id2)) {
        node2.remove();
        nodes.delete(id2);
      }
    }
  }

  return {
    sync: sync,
    size: function () {
      return nodes.size;
    },
  };
}
