// The paper texture as a PNG data URL, generated in Node with the engine's own paperTexture.
import sharp from "sharp";
import { createNoise, withNoise } from "../../src/noise.js";
import { paperTexture } from "../../src/paper.js";
import { stream, withRandom } from "../../src/rng.js";

const cache = new Map();

/** @param {string} [seed] @param {number[]} [tint] r, g, b multipliers (a palette's paper) */
export async function paperDataUrl(seed = "paper", tint = [1, 1, 1]) {
  const key = seed + tint.join(",");
  if (cache.has(key)) return cache.get(key);
  const size = 512;
  const data = Buffer.alloc(size * size * 3);
  withNoise(createNoise(stream(seed, "noise")), () =>
    withRandom(stream(seed, "paper"), () =>
      paperTexture((style, x, y) => {
        if (x >= size || y >= size) return;
        const rgb = style.slice(4, -1).split(",").map((v, i) => Math.round(Number(v) * tint[i]));
        data.set(rgb, (y * size + x) * 3);
      }),
    ),
  );
  const png = await sharp(data, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
  const url = `data:image/png;base64,${png.toString("base64")}`;
  cache.set(key, url);
  return url;
}
