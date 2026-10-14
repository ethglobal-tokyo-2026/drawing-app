import measurements from "../../../apps/frontend/src/stickers/foilSpectrum.json" with { type: "json" };
export type Vec3 = readonly [number, number, number];
export interface DiffractionSample {
  light: Vec3;
  view: Vec3;
  normal: Vec3;
  tangent: Vec3;
  sigma: number;
  wavelengthStep: number;
}
const dot = (a: Vec3, b: Vec3) => a.reduce((s, x, i) => s + x * b[i], 0);
const normalize = (v: Vec3): Vec3 => {
  const d = Math.hypot(...v);
  return [v[0] / d, v[1] / d, v[2] / d];
};
function spectralWeight(w: number) {
  const q = (w - 380) / 5,
    i = Math.min(measurements.length - 2, Math.floor(q)),
    f = q - i;
  const d = measurements[i][1] * (1 - f) + measurements[i + 1][1] * f;
  const y = measurements[i][2] * (1 - f) + measurements[i + 1][2] * f;
  return d * y;
}
/** Direct double-precision spectral summation; only measured source data is shared with production. */
export function diffractionReference(s: DiffractionSample): number {
  if (dot(s.normal, s.light) <= 0 || dot(s.normal, s.view) <= 0) return 0;
  const projected = dot(s.tangent, s.normal);
  const t = normalize([
    s.tangent[0] - projected * s.normal[0],
    s.tangent[1] - projected * s.normal[1],
    s.tangent[2] - projected * s.normal[2],
  ]);
  const n = s.normal,
    b: Vec3 = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
  const sum: Vec3 = [s.light[0] + s.view[0], s.light[1] + s.view[1], s.light[2] + s.view[2]];
  const across = dot(sum, t),
    along = dot(sum, b);
  let result = 0,
    white = 0;
  for (let wavelength = 380; wavelength <= 780; wavelength += s.wavelengthStep) {
    const weight = spectralWeight(wavelength);
    white += weight;
    for (let order = -2; order <= 2; order++) {
      if (order === 0) continue;
      const delta = across - (order * wavelength) / 1400;
      const efficiency = Math.abs(order) === 1 ? 0.3 : 0.05;
      result +=
        (weight *
          efficiency *
          Math.exp(-(delta * delta + along * along) / (2 * s.sigma * s.sigma))) /
        (2 * Math.PI * s.sigma * s.sigma);
    }
  }
  return result / white;
}
export function gaussianOrderIntegral(sigma: number) {
  let total = 0;
  const step = 0.002;
  for (let u = -2; u < 2; u += step)
    for (const order of [-2, -1, 1, 2]) {
      const delta = u - (order * 550) / 1400;
      total +=
        (((Math.abs(order) === 1 ? 0.3 : 0.05) * Math.exp((-delta * delta) / (2 * sigma * sigma))) /
          (Math.sqrt(2 * Math.PI) * sigma)) *
        step;
    }
  return total;
}

export interface ReferenceFrame {
  x: number;
  y: number;
  turn: number;
  grating: number;
  geometry: "flat" | "ramp" | "plateau";
  broad: boolean;
}
function rotate(v: Vec3, frame: ReferenceFrame): Vec3 {
  const a = (frame.turn * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const x = c * v[0] - s * v[1],
    y = s * v[0] + c * v[1],
    z = v[2];
  const ax = frame.y * 0.38,
    ay = -frame.x * 0.38;
  const across = Math.cos(ax) * y - Math.sin(ax) * z,
    toward = Math.sin(ax) * y + Math.cos(ax) * z;
  return [
    Math.cos(ay) * x + Math.sin(ay) * toward,
    across,
    -Math.sin(ay) * x + Math.cos(ay) * toward,
  ];
}
/** Dense source integration directly sums wavelengths at each accepted incident direction. */
export function referenceFrame(frame: ReferenceFrame, sourceGrid = 32, spatialGrid = 16) {
  const n = normalize(rotate(normalize([frame.geometry === "ramp" ? -0.16 : 0, 0, 1]), frame));
  const a = (frame.grating * Math.PI) / 180,
    t = rotate([Math.cos(a), Math.sin(a), 0], frame);
  const projection = dot(n, t),
    tangent = normalize([
      t[0] - projection * n[0],
      t[1] - projection * n[1],
      t[2] - projection * n[2],
    ]);
  const b: Vec3 = [
    n[1] * tangent[2] - n[2] * tangent[1],
    n[2] * tangent[0] - n[0] * tangent[2],
    n[0] * tangent[1] - n[1] * tangent[0],
  ];
  const extent = frame.broad ? 2 : 1,
    hx = 0.1 * extent,
    hy = 0.145 * extent;
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const sources: { u: number; v: number; weight: number }[] = [];
  for (let sy = 0; sy < sourceGrid; sy++)
    for (let sx = 0; sx < sourceGrid; sx++) {
      const x = 0.02 + ((2 * (sx + 0.5)) / sourceGrid - 1) * (hx + 0.015),
        y = -0.025 + ((2 * (sy + 0.5)) / sourceGrid - 1) * (hy + 0.015);
      const l = normalize([x, y, 1]);
      if (dot(l, n) <= 0) continue;
      const window =
        (1 - smooth(hx - 0.015, hx + 0.015, Math.abs(x - 0.02))) *
        (1 - smooth(hy - 0.015, hy + 0.015, Math.abs(y + 0.025)));
      sources.push({
        u: dot(l, tangent),
        v: dot(l, b),
        weight: ((window * 4 * (hx + 0.015) * (hy + 0.015)) / sourceGrid ** 2) * l[2] ** 3 * 3.06,
      });
    }
  const white = measurements.reduce((sum, row) => sum + row[1] * row[2], 0);
  const wavelengths = measurements.map((row) => ({
    offset: row[0] / 1400,
    weight: (row[1] * row[2]) / white,
  }));
  const values: number[] = [];
  const angle = (frame.turn * Math.PI) / 180;
  for (let y = 0; y < spatialGrid; y++)
    for (let x = 0; x < spatialGrid; x++) {
      const px = (Math.floor(((x + 0.5) * 240) / spatialGrid) + 0.5) / 240 - 0.5;
      const py = (Math.floor(((y + 0.5) * 240) / spatialGrid) + 0.5) / 240 - 0.5;
      const v = normalize([
        -Math.cos(angle) * px + Math.sin(angle) * py,
        -Math.sin(angle) * px - Math.cos(angle) * py,
        2.4,
      ]);
      let result = 0;
      if (dot(n, v) > 0) {
        const u = dot(v, tangent),
          along = dot(v, b);
        for (const source of sources) {
          const a = u + source.u,
            b = along + source.v;
          const alongFactor =
            (Math.exp((-b * b) / (2 * 0.08 ** 2)) / (2 * Math.PI * 0.08 ** 2)) * source.weight;
          if (alongFactor < 1e-15) continue;
          for (const wavelength of wavelengths) {
            const d = wavelength.offset;
            result +=
              wavelength.weight *
              alongFactor *
              (0.3 *
                (Math.exp(-((a - d) ** 2) / (2 * 0.08 ** 2)) +
                  Math.exp(-((a + d) ** 2) / (2 * 0.08 ** 2))) +
                0.05 *
                  (Math.exp(-((a - 2 * d) ** 2) / (2 * 0.08 ** 2)) +
                    Math.exp(-((a + 2 * d) ** 2) / (2 * 0.08 ** 2))));
          }
        }
      }
      values.push(result);
    }
  return values;
}
export function reflectionMetrics(values: readonly number[], spatialGrid = 16) {
  let energy = 0,
    x = 0,
    y = 0;
  values.forEach((value, i) => {
    energy += value;
    x += (value * ((i % spatialGrid) + 0.5) * 240) / spatialGrid;
    y += (value * (Math.floor(i / spatialGrid) + 0.5) * 240) / spatialGrid;
  });
  return { energy, x: x / energy, y: y / energy };
}
