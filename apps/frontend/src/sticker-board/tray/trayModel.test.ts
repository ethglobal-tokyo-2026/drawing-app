// @vitest-environment happy-dom
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { maskPixels } from "../../stickers/maskPixels";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import {
  MAX_STACK_SCALE,
  PACK_MARGIN,
  SHEET,
  createTrayModel,
  createTrayState,
  modelOf,
  mouthShortFor,
  sheetHeightFor,
  trayFitFor,
  type Slot,
  type TraySticker,
} from "./trayModel";
import { outline, outlineShape } from "./sheetPacking";
import type { TrayProblem } from "./trayProblem";

vi.mock("../../stickers/maskPixels", () => ({ maskPixels: vi.fn() }));

/** `n` stickers in arrival order, their cut lines of varied sizes, as drawn stickers' are. */
const stickers = (n: number, name: string) =>
  Array.from({ length: n }, (_, i): TraySticker => {
    const w = 100 + ((i * 37) % 120);
    const h = 100 + ((i * 53) % 140);
    const id = `${name}-${i}`;
    return {
      id,
      no: i + 1,
      arrivedAt: i + 1,
      sheet: 0,
      slot: 0,
      state: "here",
      width: w,
      height: h,
      outline: `M6 4L${w - 4} 6L${w - 6} ${h - 4}L4 ${h - 6}Z`,
      urls: testStickerUrls(id),
      gift: false,
      nsfw: false,
      kyotoSeika: false,
      veiled: false,
      seen: false,
    };
  });
const nothingToSay = { problem: () => {}, problemGone: () => {} };
const positionOf = (s: Slot) => {
  if (!s.pos) throw new Error(`Sticker ${s.no} has no packed position`);
  return s.pos;
};

describe("trayFitFor", () => {
  it.each([
    ["a phone", false, 640],
    ["a large screen", true, 1200],
  ])(
    "grows the page to fill a tall pouch on %s, so the mouth opens to the bottom stop",
    (_, large, foot) => {
      const fit = trayFitFor(large, () => foot);
      for (const sheets of [1, 3, 60]) {
        const sheetH = sheetHeightFor(fit, sheets);
        expect(sheetH).toBeGreaterThan(SHEET.h);
        // The stack and its lining reach the open mouth's foot.
        expect(mouthShortFor(fit, sheets, sheetH)).toBe(0);
      }
    },
  );

  it("grows a large screen's stack to its most before the page grows taller", () => {
    const fit = trayFitFor(true, () => 1200);
    expect(fit.scale).toBe(MAX_STACK_SCALE);
    expect(sheetHeightFor(fit, 60)).toBeGreaterThan(SHEET.h);
  });

  it("keeps the page its least height on a board too short for it, shrinking the stack", () => {
    const fit = trayFitFor(false, () => 420);
    expect(fit.scale).toBeLessThan(1);
    expect(sheetHeightFor(fit, 60)).toBe(SHEET.h);
    expect(mouthShortFor(fit, 60, SHEET.h)).toBe(0);
  });
});

describe("packing the sheets", () => {
  /** A tray packed for an open pouch ending at `foot`, ready to resize or filter. */
  const packedTray = (n: number, large: boolean, foot: number) => {
    const ui = createTrayState(modelOf(stickers(n, "packed"), new Set()));
    ui.fit = trayFitFor(large, () => foot);
    const model = createTrayModel(ui, new Set(), nothingToSay);
    model.applyPack();
    return { ui, model };
  };

  it.each([false, true])(
    "fits more stickers on each sheet when the board has more page height, large=%s",
    (large) => {
      const short = packedTray(40, large, 420).ui;
      const tall = packedTray(40, large, 1200).ui;
      expect(tall.model.count).toBeLessThan(short.model.count);
      expect(tall.model.slots.filter((s) => s.sheet === 0).length).toBeGreaterThan(
        short.model.slots.filter((s) => s.sheet === 0).length,
      );
    },
  );

  it("keeps a few stickers together instead of stretching their rows over the page", () => {
    const { ui } = packedTray(3, true, 1200);
    const ys = ui.model.slots.map((s) => positionOf(s).y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(160 * ui.fit.stickerScale);
  });

  it("reassigns sheets on resize while keeping the front and pulled sheet with their stickers", () => {
    const { ui, model } = packedTray(40, true, 1200);
    ui.order = [1, 0];
    ui.orderedFor = 3;
    ui.pulled = {
      f: 2,
      el: document.createElement("div"),
      x: 0,
      y: 0,
      g0: { x: 0, y: 0 },
      out: true,
      listening: new AbortController(),
    };
    const frontId = ui.model.slots.find((s) => s.sheet === ui.order[0])?.id;
    const pulledId = ui.model.slots.find((s) => s.sheet === ui.pulled?.f)?.id;
    ui.fit = trayFitFor(true, () => 1400);
    model.fitPages();
    expect(ui.model.count).toBe(5);
    expect(ui.model.slots.find((s) => s.id === frontId)?.sheet).toBe(ui.order[0]);
    expect(ui.model.slots.find((s) => s.id === pulledId)?.sheet).toBe(ui.pulled.f);
    expect(ui.order).toEqual([0, 4, 3, 2]);
  });

  it("uses the filtered stack's room and keeps the result stable when count and height disagree", () => {
    const { ui, model } = packedTray(27, false, 760);
    expect(ui.model.count).toBe(2);
    expect(ui.sheetH).toBe(632);
    expect(mouthShortFor(ui.fit, 2, ui.sheetH)).toBe(15);
    const before = ui.model.slots.map((s) => s.pos);
    expect(model.fitPages()).toBe(false);
    model.applyPack();
    expect(ui.model.slots.map((s) => s.pos)).toEqual(before);

    ui.model.slots[0].gift = true;
    ui.filter = "gifts";
    expect(model.fitPages()).toBe(true);
    expect(ui.sheetH).toBe(662);
    expect(model.sheetsMatching()).toBe(1);
    expect(model.fitPages()).toBe(false);
  });

  it("keeps every cut line inside the same page height used to pack it", () => {
    for (const [large, foot] of [
      [false, 640],
      [true, 1200],
    ] as const) {
      const { ui } = packedTray(40, large, foot);
      for (const s of ui.model.slots) {
        if (s.outline === undefined) throw new Error(`Sticker ${s.no} has no stored cut line`);
        const shape = outlineShape(s.outline, s.width, s.height);
        for (const [x, y] of outline(shape, positionOf(s))) {
          expect(x).toBeGreaterThanOrEqual(PACK_MARGIN.left);
          expect(x).toBeLessThanOrEqual(SHEET.w - PACK_MARGIN.right);
          expect(y).toBeGreaterThanOrEqual(PACK_MARGIN.top);
          expect(y).toBeLessThanOrEqual(ui.sheetH - PACK_MARGIN.bottom);
        }
      }
      const sheets = ui.model.slots.map((s) => s.sheet);
      expect(sheets).toEqual([...sheets].sort((a, b) => a - b));
    }
  });

  it("keeps used and given stickers in their spaces when the sheet capacity changes", () => {
    const { ui, model } = packedTray(40, false, 420);
    ui.model.slots[1].state = "given";
    ui.model.slots[2].state = "used";
    ui.fit = trayFitFor(true, () => 1400);
    model.fitPages();
    expect(ui.model.count).toBe(5);
    expect(ui.model.slots[1]).toMatchObject({ sheet: 0, state: "given" });
    expect(ui.model.slots[2]).toMatchObject({ sheet: 0, state: "used" });
    expect(ui.model.slots[3].pos?.n).toBe(3);
  });

  it.each([
    ["inTheBag", "onItsWay"],
    ["sendNotConfirmed", "sendNotConfirmed"],
  ] as const)(
    "reserves label space for %s and %s while keeping their sticker size",
    (first, second) => {
      const { ui, model } = packedTray(2, true, 1200);
      const before = ui.model.slots.map((s) => ({ w: positionOf(s).w, h: positionOf(s).h }));
      ui.model.slots[0].state = first;
      ui.model.slots[1].state = second;
      model.applyPack();
      expect(
        Math.abs(positionOf(ui.model.slots[0]).y - positionOf(ui.model.slots[1]).y),
      ).toBeGreaterThan(100);
      expect(ui.model.slots.map((s) => ({ w: positionOf(s).w, h: positionOf(s).h }))).toEqual(
        before,
      );
    },
  );

  it("enlarges the packed sticker cuts by a quarter on a large screen, keeping the pouch its size", () => {
    const packed = (large: boolean) => {
      const ui = createTrayState(modelOf(stickers(24, "sized"), new Set()));
      ui.fit = trayFitFor(large, () => 1200);
      createTrayModel(ui, new Set(), nothingToSay).applyPack();
      return ui;
    };
    const phone = packed(false);
    const large = packed(true);
    expect(large.fit.scale).toBe(MAX_STACK_SCALE);
    for (const [i, s] of large.model.slots.entries()) {
      const before = phone.model.slots[i].pos;
      expect(s.pos?.w).toBeCloseTo((before?.w ?? 0) * 1.25, 8);
      expect(s.pos?.h).toBeCloseTo((before?.h ?? 0) * 1.25, 8);
    }
  });

  it("repacks when the screen turns large even when the page height stays the same, then restores phone sizes", () => {
    const ui = createTrayState(modelOf(stickers(60, "resized"), new Set()));
    ui.fit = trayFitFor(false, () => 500);
    const model = createTrayModel(ui, new Set(), nothingToSay);
    model.applyPack();
    const phone = ui.model.slots.map((s) => s.pos);
    const page = ui.sheetH;

    ui.fit = trayFitFor(true, () => 500);
    expect(model.fitPages()).toBe(true);
    expect(ui.sheetH).toBe(page);
    for (const [i, s] of ui.model.slots.entries())
      expect(s.pos?.w).toBeCloseTo((phone[i]?.w ?? 0) * 1.25, 8);

    ui.fit = trayFitFor(false, () => 500);
    expect(model.fitPages()).toBe(true);
    expect(ui.model.slots.map((s) => s.pos)).toEqual(phone);
  });
});

describe("the board's alert that a cut line couldn't be read", () => {
  it("is taken back once a stored cut line replaces a failed trace, leaving the others'", async () => {
    vi.mocked(maskPixels).mockRejectedValue(new Error("the mask didn't decode"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
      vi.mocked(maskPixels).mockReset();
    });
    const outlined = stickers(2, "kept");
    // As the board kept on the device has them: without cut lines, so their masks are traced.
    const kept = outlined.map(({ outline: _outline, ...s }) => s);
    const told: TrayProblem[] = [];
    const gone: TrayProblem[] = [];
    const ui = createTrayState(modelOf(kept, new Set()));
    const model = createTrayModel(ui, new Set(), {
      problem: (p) => told.push(p),
      problemGone: (p) => gone.push(p),
    });
    await model.relayout();
    expect(told.map((p) => [p.kind, p.nos])).toEqual([
      ["cut", [kept[0].no]],
      ["cut", [kept[1].no]],
    ]);

    ui.model = modelOf([outlined[0], kept[1]], new Set());
    model.applyPack();
    expect(gone).toEqual([told[0]]);
    expect(told).toHaveLength(2);
  });
});
