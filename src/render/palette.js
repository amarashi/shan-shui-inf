// Colour roles and palettes.
//
// Elements never write CSS colours. They describe what a mark is:
//   tone(role, a, rgb)  a line or wash of a material, with opacity `a`. `rgb` is the grey
//                       (or colour) upstream used, kept so the ink palette can reproduce it.
//   body(role)          the opaque body of an object, which hides what is behind it.
//                       Upstream painted these white; colour palettes tint them by role.
//   NONE                no paint.
//   CLEAR               fully transparent (upstream's default fill, rgba(0,0,0,0)).
// A palette turns these into CSS colour strings.
//
// `a` may be a number or a string. Upstream formatted many alphas with toFixed(); keeping
// that text lets the ink palette print exactly what upstream printed.

/** Roles a colour can have. */
export const ROLES = [
  "ink", // generic brush marks
  "rock",
  "foliage",
  "trunk",
  "water",
  "foam",
  "sand",
  "sky",
  "structure",
  "cloth",
];

/**
 * @param {string} role one of ROLES
 * @param {number|string|null} a opacity; null means an opaque rgb() colour
 * @param {number[]} [rgb]
 */
export function tone(role, a, rgb = [100, 100, 100]) {
  return { role: role, rgb: rgb, a: a };
}

/** The opaque body of an object of this role (upstream: white). */
export function body(role) {
  return { role: role, body: true };
}

/** Same colour, different role. */
export function withRole(c, role) {
  return Object.assign({}, c, { role: role });
}

// An object, not null: upstream's argument defaults (args.x != undefined ? ...) treat null
// as "not given".
export const NONE = { none: true };
export const CLEAR = { role: "ink", rgb: [0, 0, 0], a: 0 };

/** The upstream look: grey ink on white bodies. Prints exactly upstream's strings. */
export const ink = {
  name: "ink",
  paint: function (c) {
    if (c === null || typeof c !== "object") throw new Error("colours must be tone(), body(), NONE or CLEAR, got " + c);
    if (c.none) return "none";
    if (c.body) return "white";
    var rgb = c.rgb[0] + "," + c.rgb[1] + "," + c.rgb[2];
    return c.a === null ? "rgb(" + rgb + ")" : "rgba(" + rgb + "," + c.a + ")";
  },
};

/**
 * Diagnostic: every role in its own colour, to check on a contact sheet that each mark
 * has the right role. Bodies are a pale wash of the role colour; tones keep their opacity.
 */
const ROLE_RGB = {
  ink: [40, 40, 40],
  rock: [200, 110, 30],
  foliage: [30, 150, 40],
  trunk: [120, 70, 20],
  water: [20, 90, 220],
  foam: [0, 200, 200],
  sand: [220, 190, 60],
  sky: [120, 170, 255],
  structure: [200, 20, 160],
  cloth: [230, 30, 30],
};
export const roles = {
  name: "roles",
  paint: function (c) {
    if (c === null || typeof c !== "object") throw new Error("colours must be tone(), body(), NONE or CLEAR, got " + c);
    if (c.none) return "none";
    var rgb = ROLE_RGB[c.role];
    if (c.body) return "rgb(" + rgb.map((v) => Math.round(255 - (255 - v) * 0.25)).join(",") + ")";
    return "rgba(" + rgb.join(",") + "," + (c.a === null ? 1 : c.a) + ")";
  },
};

export const palettes = { ink: ink, roles: roles };
