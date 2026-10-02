// Tile labelled PNGs into one review sheet with sharp.
import sharp from "sharp";

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/**
 * @param {{png: Buffer, label: string}[]} cells
 * @param {{cols: number, cellWidth: number, title?: string}} opts
 * @returns {Promise<Buffer>} PNG
 */
export async function tile(cells, { cols, cellWidth, title }) {
  const gap = 12;
  const labelH = 26;
  const titleH = title ? 40 : 0;
  const scaled = await Promise.all(
    cells.map((c) => sharp(c.png).resize({ width: cellWidth }).png().toBuffer({ resolveWithObject: true })),
  );
  const cellH = Math.max(...scaled.map((s) => s.info.height));
  const rows = Math.ceil(cells.length / cols);
  const width = cols * cellWidth + (cols + 1) * gap;
  const height = titleH + rows * (cellH + labelH) + (rows + 1) * gap;

  const layers = [];
  if (title) layers.push({ input: textPng(title, width, titleH, 22), left: 0, top: 0 });
  scaled.forEach((s, i) => {
    const left = gap + (i % cols) * (cellWidth + gap);
    const top = titleH + gap + Math.floor(i / cols) * (cellH + labelH + gap);
    layers.push({ input: textPng(cells[i].label, cellWidth, labelH, 16), left, top });
    layers.push({ input: s.data, left, top: top + labelH });
  });

  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .png()
    .toBuffer();
}

function textPng(text, width, height, size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="4" y="${height - 8}" font-family="sans-serif" font-size="${size}" fill="#333">${esc(text)}</text></svg>`,
  );
}
