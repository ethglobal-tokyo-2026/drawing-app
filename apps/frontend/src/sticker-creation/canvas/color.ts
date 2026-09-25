export type RGBA = [number, number, number, number];

export interface HSV {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export function hexToRgba(hex: string): RGBA {
  let h = hex.replace("#", "");
  if (h.length === 3) h = Array.from(h, (c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

const to2 = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");

function rgbToHex(r: number, g: number, b: number): string {
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function hsvToHex({ h, s, v }: HSV): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255);
}

export function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgba(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
