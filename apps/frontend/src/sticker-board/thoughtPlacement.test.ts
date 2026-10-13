import { describe, expect, it } from "vitest";
import { cloudShape, pairLayout, type Pt, type ThoughtWord } from "../kyoto-seika/balloonGeometry";
import { knobBox, toolbarSpot, type Box } from "./placement";
import { THOUGHT_CUT } from "./thoughtCut.fixture";
import {
  THOUGHT_CLEAR_PX,
  THOUGHT_INSET_PX,
  thoughtPlacement,
  type ThoughtSpot,
} from "./thoughtPlacement";

const PAIR: [ThoughtWord, ThoughtWord] = [
  { text: "graduation ceremony", reading: "", english: true },
  { text: "wind", reading: "", english: true },
];
const JAPANESE_PAIR: [ThoughtWord, ThoughtWord] = [
  { text: "風", reading: "", english: false },
  { text: "再会", reading: "", english: false },
];
const SCREENSHOT_PAIR: [ThoughtWord, ThoughtWord] = [
  { text: "伝説", reading: "", english: false },
  { text: "ひな", reading: "", english: false },
];
const shape = (toward: Pt) => pairLayout(PAIR, "peek", toward);
const W = 390;
const H = 700;
const board = { W, H, top: THOUGHT_INSET_PX, bottom: H - THOUGHT_INSET_PX };
const sticker = (x: number, y: number) => ({ x, y, w: 120, h: 110, r: 4 });

/** Where a spot puts the whole thought, and its clouds, on the board. */
function placed(spot: ThoughtSpot) {
  const { clouds } = spot.layout;
  const bubbles = spot.layout.trails.flat().map((bead) => ({
    left: bead.x - bead.r - 2,
    top: bead.y - bead.r - 2,
    right: bead.x + bead.r + 2,
    bottom: bead.y + bead.r + 2,
  }));
  return {
    box: {
      left: spot.left + Math.min(clouds.minX, ...bubbles.map((b) => b.left)),
      top: spot.top + Math.min(clouds.minY, ...bubbles.map((b) => b.top)),
      right: spot.left + Math.max(clouds.maxX, ...bubbles.map((b) => b.right)),
      bottom: spot.top + Math.max(clouds.maxY, ...bubbles.map((b) => b.bottom)),
    },
    middle: spot.left + (clouds.minX + clouds.maxX) / 2,
  };
}
const inside = ({ left, top, right, bottom }: Box) =>
  left >= THOUGHT_INSET_PX &&
  right <= W - THOUGHT_INSET_PX &&
  top >= board.top &&
  bottom <= board.bottom;
const meets = (a: Box, b: Box) =>
  a.left < b.right + THOUGHT_CLEAR_PX &&
  a.right > b.left - THOUGHT_CLEAR_PX &&
  a.top < b.bottom + THOUGHT_CLEAR_PX &&
  a.bottom > b.top - THOUGHT_CLEAR_PX;

/** Separate cloud bounds: a control can safely sit between the two words. */
function cloudBoxes(spot: ThoughtSpot): Box[] {
  return spot.layout.balloons.map((balloon) => {
    const angle = (balloon.spec.tilt * Math.PI) / 180;
    const points = cloudShape(balloon.spec).white.map((p) => ({
      x: spot.left + balloon.center.x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
      y: spot.top + balloon.center.y + p.x * Math.sin(angle) + p.y * Math.cos(angle),
    }));
    return {
      left: Math.min(...points.map((p) => p.x)) - 4,
      top: Math.min(...points.map((p) => p.y)) - 4,
      right: Math.max(...points.map((p) => p.x)) + 4,
      bottom: Math.max(...points.map((p) => p.y)) + 4,
    };
  });
}

/** Distance to a closed outline, measured independently of placement. */
function distanceToCut(point: Pt, cut: readonly Pt[]) {
  return Math.min(
    ...cut.map((a, i) => {
      const b = cut[(i + 1) % cut.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)),
      );
      return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
    }),
  );
}

it("keeps both word clouds and their dots close to the large turned cut shown in the phone screenshot", () => {
  const at = {
    x: 161,
    y: 313,
    w: 245,
    h: 240,
    r: -27,
    cut: THOUGHT_CUT,
  };
  const angle = (at.r * Math.PI) / 180;
  const cut = at.cut.map((point) => {
    const x = (point.x - 0.5) * at.w;
    const y = (point.y - 0.5) * at.h;
    return {
      x: at.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: at.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
  });
  const layoutOf = (toward: Pt) => pairLayout(SCREENSHOT_PAIR, "peek", toward);
  const spot = thoughtPlacement({
    sticker: at,
    board: { W: 350, H: 596, top: 8, bottom: 588 },
    shape: layoutOf,
    avoid: [knobBox(at, false), { left: 0, top: 503, right: 350, bottom: 560 }],
  });
  for (const balloon of spot.layout.balloons) {
    const turn = (balloon.spec.tilt * Math.PI) / 180;
    const gap = Math.min(
      ...cloudShape(balloon.spec).white.map((point) =>
        distanceToCut(
          {
            x: spot.left + balloon.center.x + point.x * Math.cos(turn) - point.y * Math.sin(turn),
            y: spot.top + balloon.center.y + point.x * Math.sin(turn) + point.y * Math.cos(turn),
          },
          cut,
        ),
      ),
    );
    expect(
      gap,
      "the words must stay beside the selected cut, including its empty image corners",
    ).toBeLessThanOrEqual(40);
  }
  for (const trail of spot.layout.trails) {
    expect(trail.length, "each word needs a visible connection to its sticker").toBeGreaterThan(0);
    for (let i = 1; i < trail.length; i++)
      expect(
        Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y),
      ).toBeLessThanOrEqual(16);
  }
});

describe("where a peek at a sticker's subjects goes", () => {
  it("uses a nearby clear side before moving the thought away from a small sticker", () => {
    const at = { x: 175, y: 350, w: 60, h: 40, r: 0 };
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [knobBox(at, false)] });
    for (const trail of spot.layout.trails) {
      const first = trail[0];
      const last = trail[trail.length - 1];
      expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(100);
    }
  });

  it("brings both trails back to a small sticker, even when its clouds must clear controls", () => {
    const at = { x: 175, y: 350, w: 60, h: 40, r: 0 };
    const spot = thoughtPlacement({
      sticker: at,
      board,
      shape,
      avoid: [knobBox(at, false), { left: 70, top: 400, right: 280, bottom: 450 }],
    });
    for (const trail of spot.layout.trails) {
      const bead = trail[trail.length - 1];
      const distance = Math.hypot(
        Math.max(0, Math.abs(spot.left + bead.x - at.x) - at.w / 2),
        Math.max(0, Math.abs(spot.top + bead.y - at.y) - at.h / 2),
      );
      expect(distance - bead.r).toBeCloseTo(2);
    }
  });

  it("returns to the sticker's cut rather than its image's empty corners", () => {
    const at = {
      x: 175,
      y: 350,
      w: 100,
      h: 100,
      r: 0,
      cut: [
        { x: 0.4, y: 0.4 },
        { x: 0.6, y: 0.4 },
        { x: 0.6, y: 0.6 },
        { x: 0.4, y: 0.6 },
      ],
    };
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [] });
    for (const trail of spot.layout.trails) {
      const bead = trail[trail.length - 1];
      const distance = Math.hypot(
        Math.max(0, Math.abs(spot.left + bead.x - 175) - 10),
        Math.max(0, Math.abs(spot.top + bead.y - 350) - 10),
      );
      expect(distance - bead.r).toBeCloseTo(2);
    }
  });

  it("attaches to the turned sticker's edges across phone sizes and both languages", () => {
    const pairs = [PAIR, JAPANESE_PAIR];
    for (const pair of pairs)
      for (const width of [320, 390, 440])
        for (const r of [-40, 0, 35, 80]) {
          const at = { x: width / 2, y: 350, w: 60, h: 40, r };
          const spot = thoughtPlacement({
            sticker: at,
            board: { ...board, W: width - 40 },
            shape: (toward) => pairLayout(pair, "peek", toward),
            avoid: [knobBox(at, false)],
          });
          const angle = (r * Math.PI) / 180;
          for (const trail of spot.layout.trails) {
            const bead = trail[trail.length - 1];
            const dx = spot.left + bead.x - at.x;
            const dy = spot.top + bead.y - at.y;
            const distance = Math.hypot(
              Math.max(0, Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)) - 30),
              Math.max(0, Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle)) - 20),
            );
            expect(distance - bead.r).toBeCloseTo(2);
          }
        }
  });

  it("keeps the attached trails clear of the rotate knob and toolbar", () => {
    const at = { x: 80, y: 350, w: 30, h: 20, r: 0 };
    const toolbar = toolbarSpot(at, { W: 390, H: 651 }, { w: 180, h: 40 });
    const avoid = [
      knobBox(at, false),
      { ...toolbar, right: toolbar.left + 180, bottom: toolbar.top + 40 },
    ];
    const spot = thoughtPlacement({
      sticker: at,
      board: { W: 350, H: 651, top: 8, bottom: 643 },
      shape: (toward) => pairLayout(JAPANESE_PAIR, "peek", toward),
      avoid,
    });
    for (const trail of spot.layout.trails)
      for (const bead of trail)
        for (const control of avoid) {
          const distance = Math.hypot(
            Math.max(control.left - spot.left - bead.x, 0, spot.left + bead.x - control.right),
            Math.max(control.top - spot.top - bead.y, 0, spot.top + bead.y - control.bottom),
          );
          expect(distance - bead.r).toBeGreaterThanOrEqual(THOUGHT_CLEAR_PX);
        }
  });

  it("goes above inside the board, leaning inward for stickers near its edges", () => {
    for (const x of [90, W / 2 - 20, 300]) {
      const at = sticker(x, 420);
      const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [] });
      const { box, middle } = placed(spot);
      expect(box.bottom).toBeLessThanOrEqual(at.y);
      expect(inside(box)).toBe(true);
      if (Math.abs(at.x - W / 2) > W / 4)
        expect(Math.sign(middle - at.x)).toBe(at.x < W / 2 ? 1 : -1);
    }
  });

  it("keeps clear of the rotate knob and the toolbar", () => {
    const at = sticker(W / 2, 400);
    const toolbar = { left: at.x - 90, top: at.y + 80, right: at.x + 90, bottom: at.y + 130 };
    const avoid = [knobBox(at, false), toolbar];
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid });
    const { box } = placed(spot);
    const parts = [
      ...cloudBoxes(spot),
      ...spot.layout.trails.flat().map((bead) => ({
        left: spot.left + bead.x - bead.r,
        top: spot.top + bead.y - bead.r,
        right: spot.left + bead.x + bead.r,
        bottom: spot.top + bead.y + bead.r,
      })),
    ];
    for (const b of avoid) for (const part of parts) expect(meets(part, b)).toBe(false);
    expect(inside(box)).toBe(true);
  });

  it("keeps a sticker near the board's top clear of the header and its rotate knob", () => {
    const at = sticker(150, 110);
    const header = { left: 10, top: 10, right: 200, bottom: 60 };
    const avoid = [header, knobBox(at, true)];
    const spot = thoughtPlacement({
      sticker: at,
      board,
      shape,
      avoid,
    });
    const { box } = placed(spot);
    for (const cloud of cloudBoxes(spot))
      for (const control of avoid) expect(meets(cloud, control)).toBe(false);
    expect(inside(box)).toBe(true);
  });
});

/** Whether two visible cloud outlines cross or one contains the other. */
function cloudsOverlap(first: readonly Pt[], second: readonly Pt[]) {
  const cross = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const includes = (point: Pt, polygon: readonly Pt[]) => {
    let included = false;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y)
      )
        included = !included;
    }
    return included;
  };
  return (
    includes(first[0], second) ||
    includes(second[0], first) ||
    first.some((a, i) => {
      const b = first[(i + 1) % first.length];
      return second.some((c, j) => {
        const d = second[(j + 1) % second.length];
        return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
      });
    })
  );
}

describe("nearby word clouds clear each other and selection controls", () => {
  const longEnglishPair: [ThoughtWord, ThoughtWord] = [
    { text: "graduation ceremony", reading: "", english: true },
    { text: "transformation", reading: "", english: true },
  ];
  // Two wide English clouds cannot both fit within 40px of this small rectangular image while
  // clearing its top knob and bottom toolbar. The fallback must keep controls and words readable,
  // with enough closely spaced dots to connect both ends; the reported actual cut stays within 40px.
  for (const { name, width, rotation, pair, maximumGap } of [
    {
      name: "two long English words beside a turned sticker",
      width: 350,
      rotation: -27,
      pair: longEnglishPair,
      maximumGap: 80,
    },
    {
      name: "two long English words beside the top rotate knob",
      width: 350,
      rotation: 0,
      pair: longEnglishPair,
      maximumGap: 80,
    },
    {
      name: "Japanese words on a narrow phone beside a turned sticker",
      width: 280,
      rotation: -27,
      pair: SCREENSHOT_PAIR,
      maximumGap: 40,
    },
  ])
    it(name, () => {
      const at = { x: width / 2, y: 300, w: 120, h: 108, r: rotation };
      const toolbar = toolbarSpot(at, { W: width + 40, H: 596 }, { w: 220, h: 44 });
      const avoid = [
        knobBox(at, false),
        { ...toolbar, right: toolbar.left + 220, bottom: toolbar.top + 44 },
      ];
      const spot = thoughtPlacement({
        sticker: at,
        board: { W: width, H: 596, top: 8, bottom: 588 },
        shape: (toward) => pairLayout(pair, "peek", toward),
        avoid,
      });
      const outlines = spot.layout.balloons.map((balloon) => {
        const turn = (balloon.spec.tilt * Math.PI) / 180;
        return cloudShape(balloon.spec).white.map((point) => ({
          x: spot.left + balloon.center.x + point.x * Math.cos(turn) - point.y * Math.sin(turn),
          y: spot.top + balloon.center.y + point.x * Math.sin(turn) + point.y * Math.cos(turn),
        }));
      });
      const angle = (at.r * Math.PI) / 180;
      const cut = [
        { x: -at.w / 2, y: -at.h / 2 },
        { x: at.w / 2, y: -at.h / 2 },
        { x: at.w / 2, y: at.h / 2 },
        { x: -at.w / 2, y: at.h / 2 },
      ].map((point) => ({
        x: at.x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
        y: at.y + point.x * Math.sin(angle) + point.y * Math.cos(angle),
      }));
      expect(cloudsOverlap(outlines[0], outlines[1]), "both words must remain readable").toBe(
        false,
      );
      for (const outline of outlines)
        expect(Math.min(...outline.map((point) => distanceToCut(point, cut)))).toBeLessThanOrEqual(
          maximumGap,
        );
      for (const outline of outlines)
        for (const control of avoid) {
          const rectangle = [
            { x: control.left, y: control.top },
            { x: control.right, y: control.top },
            { x: control.right, y: control.bottom },
            { x: control.left, y: control.bottom },
          ];
          expect(cloudsOverlap(outline, rectangle), "the cloud must not cover a control").toBe(
            false,
          );
          const gap = Math.min(
            ...outline.map((point) => distanceToCut(point, rectangle)),
            ...rectangle.map((point) => distanceToCut(point, outline)),
          );
          expect(
            gap,
            "the cloud ink keeps its clearance around the control",
          ).toBeGreaterThanOrEqual(THOUGHT_CLEAR_PX + 4 - 0.001);
        }
      for (const [index, trail] of spot.layout.trails.entries()) {
        expect(trail.length).toBeGreaterThan(0);
        const first = { x: spot.left + trail[0].x, y: spot.top + trail[0].y };
        expect(
          distanceToCut(first, outlines[index]) - trail[0].r,
          "the first dot stays beside its own cloud",
        ).toBeLessThanOrEqual(12);
        for (let i = 1; i < trail.length; i++)
          expect(
            Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y),
          ).toBeLessThanOrEqual(16);
      }
    });
});
