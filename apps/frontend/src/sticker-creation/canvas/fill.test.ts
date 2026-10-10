import { describe, expect, it } from "vitest";
import { seededRandom } from "../../ui/seededRandom";
import type { Rect } from "../sealing/stickerPasses";
import {
  findFill,
  findOnSheet,
  floodFill,
  floodSheet,
  recordFill,
  replayFill,
  SAME_COLOR,
  TUCK,
  writeFill,
  type FoundFill,
  type Pixels,
} from "./fill";

type Rgba = [number, number, number, number];
type Cut = Record<"left" | "top" | "right" | "bottom", boolean>;

const INK: Rgba = [28, 24, 36, 255];
const RED = [255, 0, 0] as const;
const KEY: Record<string, Rgba> = {
  ".": [0, 0, 0, 0],
  "#": INK,
  // Faint enough to count as empty paper.
  f: [28, 24, 36, 100],
  // A line's soft edge: ink, but not opaque.
  e: [28, 24, 36, 191],
  o: [255, 90, 54, 255],
  // Within the tolerance of o (|ΔRGB| sums to 46)…
  p: [255, 110, 80, 255],
  // …and outside it (sums to 105).
  q: [200, 40, 54, 255],
  // The fill color, opaque, then at the alphas of e and f.
  R: [...RED, 255],
  E: [...RED, 191],
  F: [...RED, 100],
};
/** The widest opening, in pixels, the tests' fills close. */
const GAP = 2;

/** Pixels from rows of characters, one per pixel, colored by `KEY`. */
function image(rows: string[]): Pixels {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => row.split("").forEach((c, x) => data.set(KEY[c], (y * width + x) * 4)));
  return { width, height: rows.length, data };
}

/** Clear pixels the size of `img`: a layer with no ink. */
const blank = ({ width, height }: { width: number; height: number }): Pixels => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

const at = (img: Pixels, x: number, y: number) => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];

const copyOf = (img: Pixels): Pixels => ({ ...img, data: img.data.slice() });

/** Copies a block the size of `size` from (fx, fy) of `from` to (tx, ty) of `to`. */
function blit(
  from: Pixels,
  fx: number,
  fy: number,
  to: Pixels,
  tx: number,
  ty: number,
  size: Rect,
) {
  for (let row = 0; row < size.h; row++) {
    const start = ((fy + row) * from.width + fx) * 4;
    to.data.set(from.data.subarray(start, start + size.w * 4), ((ty + row) * to.width + tx) * 4);
  }
}

/** The pixels in `box` of `img`, as a sheet's read gives them. */
function crop(img: Pixels, box: Rect): Pixels {
  const pixels = blank({ width: box.w, height: box.h });
  blit(img, box.x, box.y, pixels, 0, 0, box);
  return pixels;
}

/** The whole image flooded in place, closing openings up to `gap`, as a fill reading the whole sheet. */
function wholeImageFill(img: Pixels, x: number, y: number, gap: number): Pixels {
  const out = copyOf(img);
  floodFill(out, x, y, RED, gap);
  return out;
}

/** A fill as the ink takes one: `floodSheet` reads boxes of `img`, and only the changed box is written back. */
function sheetFill(img: Pixels, x: number, y: number, gap: number, near: number) {
  const reads: Rect[] = [];
  const read = (box: Rect) => {
    reads.push(box);
    return crop(img, box);
  };
  const out = copyOf(img);
  const flood = floodSheet(img, read, x, y, RED, gap, near);
  if (flood) {
    const { pixels, at: box, changed } = flood;
    blit(pixels, changed.x, changed.y, out, box.x + changed.x, box.y + changed.y, changed);
  }
  return { out, reads };
}

/** The fill from (x, y) on `shown`, which the test expects to change something. */
function mustFind(shown: Pixels, x: number, y: number, gap: number): FoundFill {
  const found = findFill(shown, x, y, RED, gap);
  if (!found) throw new Error(`The fill from (${x}, ${y}) changes nothing`);
  return found;
}

/** A shape drawn closed, soft inside as deep as the tuck, with a faint speck, beside a colored patch. */
const SHEET = image([
  "...........................",
  "..#############............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#....ooooo...",
  "..#ee.......ee#....opooq...",
  "..#ee...f...ee#....ooooo...",
  "..#ee.......ee#............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#............",
  "..#############............",
  "...........................",
]);

/** A shape whose bottom line has an opening `across` pixels wide, with open paper round it. */
const shapeWithOpening = (across: number) =>
  image([
    "....................",
    "....................",
    "..###########.......",
    "..#.........#.......",
    "..#.........#.......",
    "..#.........#.......",
    "..#.........#.......",
    `..####${".".repeat(across)}${"#".repeat(7 - across)}.......`,
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
  ]);

/** A shape whose opening the tests' fills close. */
const OPENING = shapeWithOpening(GAP);

/** A closed triangle with sharp corners. */
const TRIANGLE = image([
  "..................",
  ".################.",
  "..#.............#.",
  "...#............#.",
  "....#...........#.",
  ".....#..........#.",
  "......#.........#.",
  ".......#........#.",
  "........#.......#.",
  ".........#......#.",
  "..........#.....#.",
  "...........#....#.",
  "............#...#.",
  ".............#..#.",
  "..............#.#.",
  "...............##.",
  "..................",
]);

/** A closed loop with no room inside as wide as the gaps it's filled with. */
const LOOP = image([
  "..........",
  "..#####...",
  "..#...#...",
  "..#...#...",
  "..#####...",
  "..........",
]);

/** One color in two blobs, joined by a stroke narrower than the gap. */
const DUMBBELL = image([
  "...............",
  ".ooooo...ooooo.",
  ".ooooo...ooooo.",
  ".ooooooooooooo.",
  ".ooooo...ooooo.",
  ".ooooo...ooooo.",
  "...............",
]);

/** Two short strokes, each soft at its ends and fading to a faint fringe. */
const STROKES = image(["...........", "...fe#ef...", "...........", "...fe#ef...", "..........."]);

/** A closed frame round the middle, with ink, soft edges and faint specks strewn inside and out. */
const SCATTERED = (() => {
  const [w, h] = [120, 90];
  const random = seededRandom(7);
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
  for (let k = 0; k < 600; k++) {
    rows[Math.floor(random() * h)][Math.floor(random() * w)] = "#eef"[Math.floor(random() * 3)];
  }
  for (let x = 35; x <= 85; x++) rows[25][x] = rows[65][x] = "#";
  for (let y = 25; y <= 65; y++) rows[y][35] = rows[y][85] = "#";
  return image(rows.map((row) => row.join("")));
})();
/** Too narrow for `SCATTERED`'s frame, so a fill inside it reads wider squares before it fits. */
const SCATTERED_NEAR = 16;

describe("floodFill", () => {
  it("fills empty paper up to the line, counting faint pixels as empty", () => {
    const img = image([
      "..........",
      ".########.",
      ".########.",
      ".##....##.",
      ".##.f..##.",
      ".##....##.",
      ".########.",
      ".########.",
      "..........",
    ]);
    expect(floodFill(img, 3, 3, RED, 0)).not.toBeNull();
    expect(at(img, 3, 3)).toEqual([...RED, 255]);
    expect(at(img, 6, 5)).toEqual([...RED, 255]);
    expect(at(img, 4, 4)).toEqual([...RED, 255]);
    expect(at(img, 1, 1)).toEqual(INK);
    expect(at(img, 0, 0)).toEqual(KEY["."]);
    expect(at(img, 9, 8)).toEqual(KEY["."]);
  });

  it("fills a colored region across small color differences but not large ones", () => {
    const img = image(["oopoq", "ooooq"]);
    floodFill(img, 0, 0, RED, 0);
    expect(at(img, 2, 0)).toEqual([...RED, 255]);
    expect(at(img, 4, 0)).toEqual(KEY.q);
  });

  it("does nothing on a color closer to the fill color than SAME_COLOR, and fills one that far", () => {
    const [r, g, b] = KEY.o;
    const img = image(["ooo"]);
    const before = [...img.data];
    expect(floodFill(img, 1, 0, [r, g + SAME_COLOR - 1, b], 0)).toBeNull();
    expect([...img.data]).toEqual(before);
    expect(floodFill(img, 1, 0, [r, g + SAME_COLOR, b], 0)).not.toBeNull();
  });

  it("tucks the fill TUCK px under a line's soft edge", () => {
    const paper = 4;
    const img = image([`${".".repeat(paper)}${"e".repeat(TUCK + 2)}....`]);
    floodFill(img, 0, 0, RED, 0);
    for (let x = paper; x < paper + TUCK; x++) {
      // The fill shows through under the edge, so the pixel sits between the ink and the fill.
      expect(at(img, x, 0)).toSatisfy(
        ([r, g, b, a]: number[]) =>
          a === 255 &&
          [r, g, b].every((c, k) => c > Math.min(INK[k], RED[k]) && c < Math.max(INK[k], RED[k])),
      );
    }
    expect(at(img, paper + TUCK, 0)).toEqual(KEY.e);
    expect(at(img, img.width - 1, 0)).toEqual(KEY["."]);
  });

  it.each([
    ["no fringe", "....#...."],
    ["faint fringes", "...f#f..."],
  ])("leaves what lies past a line thinner than the tuck as it was, with %s", (_, row) => {
    const img = image(Array.from({ length: 7 }, () => row));
    const before = copyOf(img);
    floodFill(img, 0, 3, RED, GAP);
    expect(at(img, 0, 3)).toEqual([...RED, 255]);
    for (let y = 0; y < img.height; y++) {
      for (let x = row.indexOf("#") + 1; x < img.width; x++) {
        expect(at(img, x, y), `${x}, ${y}`).toEqual(at(before, x, y));
      }
    }
  });

  it("recolors a stroke without growing it: every pixel keeps its alpha, and the fringe takes the color", () => {
    const img = copyOf(STROKES);
    const alphas = () => [...img.data].filter((_, i) => i % 4 === 3);
    const before = alphas();
    for (const color of [RED, [0, 0, 255] as const, RED]) floodFill(img, 5, 1, color, GAP);
    expect(alphas()).toEqual(before);
    for (const x of [3, 4, 5, 6, 7]) expect(at(img, x, 1)).toEqual([...RED, at(img, x, 1)[3]]);
  });
});

describe("floodFill closing gaps", () => {
  it("holds a fill on paper in a shape whose opening is as wide as the gap", () => {
    const filled = wholeImageFill(OPENING, 5, 4, GAP);
    expect(at(filled, 5, 4)).toEqual([...RED, 255]);
    // Past the tuck under the opening, and round the shape.
    expect(at(filled, 6, 10)).toEqual(KEY["."]);
    expect(at(filled, 0, 0)).toEqual(KEY["."]);
  });

  it("lets a fill out through an opening wider than the gap", () => {
    expect(at(wholeImageFill(shapeWithOpening(GAP + 1), 5, 4, GAP), 0, 0)).toEqual([...RED, 255]);
  });

  it("holds a fill on paper at a line that stops as near the sheet's edge as the gap", () => {
    const img = image([
      "............",
      "............",
      "............",
      "##########..",
      "............",
      "............",
      "............",
    ]);
    expect(at(wholeImageFill(img, 5, 1, GAP), 5, 6)).toEqual(KEY["."]);
    expect(at(wholeImageFill(img, 5, 1, 0), 5, 6)).toEqual([...RED, 255]);
  });

  it.each([
    ["a closed shape with soft edges", SHEET, 6, 5, GAP],
    ["a closed shape's sharp corners", TRIANGLE, 12, 4, 2 * GAP],
    ["a closed loop with no room as wide as the gap", LOOP, 4, 2, 2 * GAP],
    ["a color joined narrower than the gap", DUMBBELL, 3, 3, GAP],
  ])("fills %s as it would without closing gaps", (_, img, x, y, gap) => {
    expect(wholeImageFill(img, x, y, gap).data).toEqual(wholeImageFill(img, x, y, 0).data);
  });
});

describe("findFill and writeFill on one layer", () => {
  /** Pixels as rows of characters: `KEY`'s, and a digit for each other color, named after the rows. */
  function render(img: Pixels): string {
    const names = new Map(Object.entries(KEY).map(([c, rgba]) => [rgba.join(), c]));
    const others: string[] = [];
    const rows: string[] = [];
    for (let y = 0; y < img.height; y++) {
      let row = "";
      for (let x = 0; x < img.width; x++) {
        const rgba = at(img, x, y).join();
        let name = names.get(rgba);
        if (name === undefined) {
          name = String(others.length);
          names.set(rgba, name);
          others.push(`${name}: ${rgba}`);
        }
        row += name;
      }
      rows.push(row);
    }
    return [...rows, ...others].join("\n");
  }

  /** The fill from (x, y) found on `img` and written back onto it, rendered, or what it found instead. */
  function oneLayerFill(img: Pixels, x: number, y: number, gap: number, cut?: Cut): string {
    const out = copyOf(img);
    const found = findFill(out, x, y, RED, gap, cut);
    if (found === null || found === "past") return String(found);
    writeFill(out, out, found, RED);
    return render(out);
  }

  // The snapshots were taken from the fill before finding and writing were split.
  it.each([
    ["on paper inside a closed shape", SHEET, 6, 5, 0],
    ["on paper inside a closed shape, closing gaps", SHEET, 6, 5, GAP],
    ["on open paper", SHEET, 0, 0, 0],
    ["recoloring a patch", SHEET, 19, 4, 0],
    ["recoloring a soft stroke", STROKES, 5, 1, GAP],
    ["in a shape whose opening it closes", OPENING, 5, 4, GAP],
    ["in that shape's opening", OPENING, 6, 7, GAP],
    ["out through an opening wider than the gap", shapeWithOpening(GAP + 1), 5, 4, GAP],
    ["in a closed shape's sharp corners", TRIANGLE, 12, 4, 2 * GAP],
    ["in a closed loop with no room as wide as the gap", LOOP, 4, 2, 2 * GAP],
    ["recoloring a color joined narrower than the gap", DUMBBELL, 3, 3, GAP],
  ])("writes what the fill wrote before, %s", (_, img, x, y, gap) => {
    expect(oneLayerFill(img, x, y, gap)).toMatchSnapshot();
  });

  it.each([
    ["inside a closed shape clear of the cut", SHEET, { x: 0, y: 0, w: 17, h: 11 }, 6, 5],
    ["on open paper that reaches the cut", SHEET, { x: 0, y: 0, w: 17, h: 11 }, 0, 0],
    [
      "inside a frame, in the square that holds it",
      SCATTERED,
      { x: 28, y: 13, w: 65, h: 65 },
      60,
      45,
    ],
    [
      "inside a frame, in a square too small for it",
      SCATTERED,
      { x: 52, y: 37, w: 17, h: 17 },
      60,
      45,
    ],
  ])("writes what the fill wrote before on pixels cut from a sheet, %s", (_, img, box, x, y) => {
    const cut = {
      left: box.x > 0,
      top: box.y > 0,
      right: box.x + box.w < img.width,
      bottom: box.y + box.h < img.height,
    };
    expect(oneLayerFill(crop(img, box), x - box.x, y - box.y, GAP, cut)).toMatchSnapshot();
  });
});

describe("a fill on one layer of several", () => {
  it("fills the lines' enclosed paper on an empty layer under them, tucked under their soft edges", () => {
    const lines = copyOf(SHEET);
    const layer = blank(SHEET);
    // The layer under the lines is empty, so the lines' own pixels are what's shown.
    writeFill(layer, lines, mustFind(lines, 6, 5, 0), RED);
    expect(layer.data).toEqual(
      image([
        "...........................",
        "...........................",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...RRRRRRRRRRR.............",
        "...........................",
        "...........................",
      ]).data,
    );
    expect(lines.data).toEqual(SHEET.data);
  });

  it("recolors a stroke shown from another layer by writing its shape onto this one, at the alpha shown", () => {
    const strokes = copyOf(STROKES);
    const layer = blank(STROKES);
    writeFill(layer, strokes, mustFind(strokes, 5, 1, GAP), RED);
    expect(layer.data).toEqual(
      image(["...........", "...FEREF...", "...........", "...........", "..........."]).data,
    );
    expect(strokes.data).toEqual(STROKES.data);
  });
});

describe("a fill on a locked layer", () => {
  it.each([
    [
      "on paper, in its region and its tuck",
      SHEET,
      SHEET,
      6,
      5,
      0,
      [
        "...........................",
        "..#############............",
        "..#EEEEEEEEEEE#............",
        "..#EEEEEEEEEEE#....ooooo...",
        "..#EE.......EE#....opooq...",
        "..#EE...F...EE#....ooooo...",
        "..#EE.......EE#............",
        "..#EEEEEEEEEEE#............",
        "..#EEEEEEEEEEE#............",
        "..#############............",
        "...........................",
      ],
    ],
    [
      // The layer's ink sits under the strokes' opaque cores, so what's shown is the strokes alone.
      "recoloring a stroke shown from another layer",
      STROKES,
      image(["...........", ".....e.....", "...........", ".....#.....", "..........."]),
      5,
      1,
      GAP,
      ["...........", ".....E.....", "...........", ".....#.....", "..........."],
    ],
  ])(
    "gives the fill's color only to the pixels the layer has, at their own alpha, %s",
    (_, shown, layer, x, y, gap, expected) => {
      const target = copyOf(layer);
      writeFill(target, shown, mustFind(shown, x, y, gap), RED, true);
      expect(target.data).toEqual(image(expected).data);
    },
  );
});

describe("recordFill and replayFill", () => {
  it.each([
    ["a paper fill", SCATTERED, SCATTERED, 60, 45],
    ["a recolor of a stroke shown from another layer", STROKES, blank(STROKES), 5, 1],
  ])("replays %s on its layer as it was before, byte for byte", (_, shown, layer, x, y) => {
    const sheet = findOnSheet(shown, (box) => crop(shown, box), x, y, RED, GAP, SCATTERED_NEAR);
    if (!sheet) throw new Error(`The fill from (${x}, ${y}) changes nothing`);
    const { at: read, found } = sheet;
    const after = crop(layer, read);
    writeFill(after, sheet.shown, found, RED);
    const written = recordFill(after, read, found);
    const filled = copyOf(layer);
    blit(after, 0, 0, filled, read.x, read.y, read);

    // Replayed on only the box it wrote, read from the layer as it was.
    const box = crop(layer, written.box);
    replayFill(box, written.box, written);
    const replayed = copyOf(layer);
    blit(box, 0, 0, replayed, written.box.x, written.box.y, written.box);
    expect(replayed.data).not.toEqual(layer.data);
    expect(replayed.data).toEqual(filled.data);
  });

  it("keeps a paper fill of a large enclosed rectangle in few color runs a row", () => {
    const [w, h] = [120, 90];
    const rows = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
        return inset === 0 ? "#" : inset <= TUCK ? "e" : ".";
      }).join(""),
    );
    const rect = image(rows);
    const found = mustFind(rect, w / 2, h / 2, 0);
    writeFill(rect, rect, found, RED);
    const { colors } = recordFill(rect, { x: 0, y: 0, w, h }, found);
    // Each run is a count and a color.
    expect(colors.length / 2).toBeLessThan(found.box.h * 4);
  });
});

describe("floodSheet", () => {
  it.each([
    ["inside the closed shape", SHEET, 6, 5, 0],
    ["on open paper", SHEET, 0, 0, 0],
    ["on the colored patch", SHEET, 19, 4, 0],
    ["inside the closed shape, closing gaps", SHEET, 6, 5, GAP],
    ["inside a shape whose opening it closes", OPENING, 5, 4, GAP],
    ["outside that shape", OPENING, 15, 10, GAP],
    ["in that shape's opening", OPENING, 6, 7, GAP],
  ])("gives the whole-image fill's pixels %s, whatever box it reads first", (_, img, x, y, gap) => {
    const expected = wholeImageFill(img, x, y, gap).data;
    // Every size moves the box's sides across the region: cutting it, touching it or its tuck, clearing it.
    for (let near = 1; near <= img.width + 2; near++) {
      expect(sheetFill(img, x, y, gap, near).out.data, `near ${near}`).toEqual(expected);
    }
  });

  it.each([0, GAP])(
    "reads only the box around the seed when the region and its tuck fit inside it, closing gaps of %s",
    (gap) => {
      const { reads } = sheetFill(SHEET, 6, 5, gap, 16);
      expect(reads).toHaveLength(1);
      expect(reads[0].w * reads[0].h).toBeLessThan(SHEET.width * SHEET.height);
    },
  );

  describe("on a sheet of scattered strokes", () => {
    it.each([
      ["inside the frame", 60, 45],
      ["outside it, reaching the whole sheet", 5, 5],
    ])("gives the whole-image fill's pixels %s, closing gaps or not", (_, x, y) => {
      for (const gap of [0, GAP]) {
        const { out, reads } = sheetFill(SCATTERED, x, y, gap, SCATTERED_NEAR);
        expect(out.data, `gap ${gap}`).toEqual(wholeImageFill(SCATTERED, x, y, gap).data);
        expect(reads.length).toBeGreaterThan(1);
      }
    });

    it("never reads the whole sheet for a region inside the frame", () => {
      const { reads } = sheetFill(SCATTERED, 60, 45, GAP, SCATTERED_NEAR);
      for (const box of reads)
        expect(box.w * box.h).toBeLessThan(SCATTERED.width * SCATTERED.height);
    });
  });
});
