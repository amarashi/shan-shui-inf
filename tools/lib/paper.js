// The paper texture as a PNG data URL, generated in Node with the engine's own paperTexture.
import sharp from "sharp";
import { createNoise, withNoise } from "../../src/noise.js";
import { paperTexture } from "../../src/paper.js";
import { stream, withRandom } from "../../src/rng.js";

let cached = null;

export async function paperDataUrl(seed = "paper") {
  if (cached) return cached;
  const size = 512;
  const data = Buffer.alloc(size * size * 3);
  withNoise(createNoise(stream(seed, "noise")), () =>
    withRandom(stream(seed, "paper"), () =>
      paperTexture((style, x, y) => {
        if (x >= size || y >= size) return;
        const rgb = style.slice(4, -1).split(",").map(Number);
        data.set(rgb, (y * size + x) * 3);
      }),
    ),
  );
  const png = await sharp(data, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
  cached = `data:image/png;base64,${png.toString("base64")}`;
  return cached;
}
