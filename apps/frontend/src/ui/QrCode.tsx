import { useMemo } from "react";
import { qrModules } from "./qrModules";

interface Props {
  value: string;
  /** Width and height, in px. */
  size: number;
  /** Names the code for assistive tech; without one it's hidden from it. */
  label?: string;
  className?: string;
}

/** A finder pattern's side, in modules. */
const FINDER = 7;

/**
 * `value` as a QR code in currentColor on a clear ground. It has no quiet zone of its own: keep four
 * modules of white paper around it, or scanners miss it.
 */
export function QrCode({ value, size, label, className }: Props) {
  const { side, modules, finders } = useMemo(() => {
    const grid = qrModules(value);
    return { side: grid.length, modules: modulePath(grid), finders: finderPath(grid.length) };
  }, [value]);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      fill="currentColor"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {/* One path of merged runs leaves no seams between modules; crisp edges keep them sharp. */}
      <path d={modules} shapeRendering="crispEdges" />
      <path d={finders} fillRule="evenodd" />
    </svg>
  );
}

/** Top left, top right and bottom left: where a code `side` modules wide keeps its finders. */
const finderCorners = (side: number): [number, number][] => [
  [0, 0],
  [side - FINDER, 0],
  [0, side - FINDER],
];

/** The dark modules outside the finders, each horizontal run of them as one rectangle. */
function modulePath(grid: boolean[][]) {
  const side = grid.length;
  const corners = finderCorners(side);
  const dark = (x: number, y: number) =>
    grid[y][x] &&
    !corners.some(([fx, fy]) => x >= fx && x < fx + FINDER && y >= fy && y < fy + FINDER);
  let d = "";
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side;) {
      if (!dark(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < side && dark(x, y)) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return d;
}

/**
 * The finders, each a ring round a 3×3 eye, filled even-odd. Their soft corners are those of LINE's
 * own codes; scanners find a finder by the proportions across its middle, which rounding keeps.
 */
function finderPath(side: number) {
  return finderCorners(side)
    .map(
      ([x, y]) =>
        roundedSquare(x, y, FINDER, 1.6) +
        roundedSquare(x + 1, y + 1, FINDER - 2, 1) +
        roundedSquare(x + 2, y + 2, FINDER - 4, 0.9),
    )
    .join("");
}

/** A square `size` modules wide at (x, y), its corners rounded by `r`. */
function roundedSquare(x: number, y: number, size: number, r: number) {
  // Moving by `r` from (x, y) and rounding `edge` keep float noise such as 1.2000000000000002 out of
  // the markup.
  const edge = Number((size - 2 * r).toFixed(3));
  const arc = (dx: number, dy: number) => `a${r} ${r} 0 0 1 ${dx} ${dy}`;
  return `M${x} ${y}m${r} 0h${edge}${arc(r, r)}v${edge}${arc(-r, r)}h${-edge}${arc(-r, -r)}v${-edge}${arc(r, -r)}z`;
}
