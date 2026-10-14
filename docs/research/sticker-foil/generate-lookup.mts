/** Regenerate after changing grating optics or spectral data: pnpm exec node docs/research/sticker-foil/generate-lookup.mts */
import { writeFile } from "node:fs/promises";
import spectrum from "../../../apps/frontend/src/stickers/foilSpectrum.json" with { type: "json" };
const width = 512,
  height = 32;
const white = spectrum.reduce((sum, row) => sum + row[1] * row[2], 0);
const direct = Buffer.alloc(width * height * 7),
  bridge = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y++) {
  const sigma = 0.035 + (y / (height - 1)) * 0.185;
  for (let x = 0; x < width; x++) {
    const u = -2 + (x / (width - 1)) * 4,
      weights = Array<number>(6).fill(0),
      removed = [0, 0, 0];
    let energy = 0,
      radiant = 0;
    for (const [wavelength, d65, sensitivity] of spectrum) {
      let response = 0;
      for (const order of [-2, -1, 1, 2])
        response +=
          ((Math.abs(order) === 1 ? 0.3 : 0.05) *
            Math.exp(-0.5 * ((u - (order * wavelength) / 1400) / sigma) ** 2)) /
          (Math.sqrt(2 * Math.PI) * sigma);
      energy += (response * d65 * sensitivity) / white;
      // Palette slots take radiant power, not luminance, so an order's hue follows its wavelength
      // instead of collapsing onto the eye's green peak.
      const value = response * d65;
      radiant += value;
      // The offset splits holo's neutral lemon-to-aqua bridge across the dim ends of the spectrum,
      // so the bright middle lands on saturated palette colors instead of white.
      const phase = (((wavelength - 380) / 400) * 6 + 2.5) % 6,
        index = Math.floor(phase),
        f = phase - index;
      weights[index] += value * (1 - f);
      weights[(index + 1) % 6] += value * f;
      if (index === 2) {
        const whiteWeight = 2 * Math.min(f, 1 - f);
        removed[0] += value * (1 - f - (f < 0.5 ? 1 - 2 * f : 0));
        removed[1] += value * (f - (f > 0.5 ? 2 * f - 1 : 0));
        removed[2] += value * whiteWeight;
      }
    }
    const at = y * width + x;
    for (let i = 0; i < 6; i++)
      direct[at * 7 + i] = Math.round((weights[i] / Math.max(radiant, 1e-30)) * 255);
    direct[at * 7 + 6] = Math.round(Math.sqrt(energy / 8) * 255);
    for (let i = 0; i < 3; i++)
      bridge[at * 3 + i] = Math.round((removed[i] / Math.max(radiant, 1e-30)) * 255);
  }
  if (y % 8 === 0) console.log(`Integrated spectral row ${y + 1}/${height}`);
}
await writeFile(
  new URL("../../../apps/frontend/src/stickers/foilLookupBasis.json", import.meta.url),
  JSON.stringify(
    {
      width,
      height,
      direct: direct.toString("base64"),
      bridge: bridge.toString("base64"),
    },
    null,
    2,
  ) + "\n",
);
console.log("Saved palette-independent foil lookup basis");
