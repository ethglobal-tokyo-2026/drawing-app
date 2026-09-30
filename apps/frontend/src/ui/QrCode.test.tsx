// @vitest-environment happy-dom
import { decodeQR } from "@paulmillr/qr/decode.js";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { etherscanAddressUrl } from "../identity/explorers";
import { clamp } from "./easing";
import { QrCode } from "./QrCode";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ADDRESS = "0x3F2A9C1b7e3d55a091bc04EE6A2F1D3c8b70AE12";

let host: HTMLDivElement;
let root: Root;

const draw = (value: string, label?: string) => {
  act(() => root.render(<QrCode value={value} size={116} label={label} />));
  const svg = host.querySelector("svg");
  if (!svg) throw new Error("QrCode drew no <svg>");
  return svg;
};

/** Whether (x, y) is inside a square at (sx, sy) whose straight `edge`s meet in arcs of radius `r`. */
const inRoundedSquare = (x: number, y: number, [sx, sy, r, edge]: number[]) =>
  Math.hypot(x - clamp(x, sx + r, sx + r + edge), y - clamp(y, sy + r, sy + r + edge)) <= r;

/** The numbers each match of `shape` captures in path data `d`. */
const shapes = (d: string, shape: RegExp) =>
  [...d.matchAll(shape)].map((match) => match.slice(1).map(Number));

/**
 * A drawn code as a camera sees it on paper: dark on white, 4 px a module, 4 modules of quiet zone.
 * Pixels fill by the paths' own geometry: the module runs, and the finders' rounded squares even-odd.
 */
function photograph(svg: SVGSVGElement) {
  const d = [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")).join("");
  const runs = shapes(d, /M(\d+) (\d+)h(\d+)/g);
  const squares = shapes(d, /M(\d+) (\d+)m([\d.]+) 0h([\d.]+)/g);
  const dark = (x: number, y: number) =>
    runs.some(([rx, ry, w]) => x >= rx && x < rx + w && y >= ry && y < ry + 1) ||
    squares.filter((square) => inRoundedSquare(x, y, square)).length % 2 === 1;
  const [scale, quiet] = [4, 4];
  const width = (Number(svg.getAttribute("viewBox")?.split(" ")[2]) + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let py = 0; py < width; py++) {
    for (let px = 0; px < width; px++) {
      if (!dark((px + 0.5) / scale - quiet, (py + 0.5) / scale - quiet)) continue;
      const i = (py * width + px) * 4;
      data.fill(0, i, i + 3);
    }
  }
  return { width, height: width, data };
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("QrCode", () => {
  it.each([ADDRESS, etherscanAddressUrl(ADDRESS)])("scans back to %s as drawn", (value) => {
    expect(decodeQR(photograph(draw(value)))).toBe(value);
  });

  it("names itself for assistive tech only when given a label", () => {
    const labeled = draw(ADDRESS, "Board address");
    expect([labeled.getAttribute("role"), labeled.getAttribute("aria-label")]).toEqual([
      "img",
      "Board address",
    ]);
    expect(draw(ADDRESS).getAttribute("aria-hidden")).toBe("true");
  });
});
