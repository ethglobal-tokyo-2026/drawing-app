import { describe, expect, it, onTestFinished, vi } from "vitest";
import { maskPixels } from "../../stickers/maskPixels";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import {
  MAX_STACK_SCALE,
  SHEET,
  createTrayModel,
  createTrayState,
  modelOf,
  mouthShortFor,
  sheetHeightFor,
  trayFitFor,
  type TraySticker,
} from "./trayModel";
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
  /** Each sticker's sheet, as the tray packs `n` stickers for an open pouch ending at `foot`. */
  const sheetsOf = (n: number, large: boolean, foot: number) => {
    const ui = createTrayState(modelOf(stickers(n, "packed"), new Set()));
    ui.fit = trayFitFor(large, () => foot);
    createTrayModel(ui, new Set(), nothingToSay).applyPack();
    return ui.model.slots.map((s) => s.sheet);
  };

  it("never moves a sticker to another sheet as more arrive or its layout changes height", () => {
    const most = 40;
    for (const large of [false, true]) {
      const sheets = sheetsOf(most, large, 640);
      expect(new Set(sheets).size).toBeGreaterThan(2);
      const heights = large ? [560, 800, 1100, 1400] : [420, 520, 640, 760, 900];
      for (const foot of heights)
        for (let n = 1; n <= most; n++)
          expect(sheetsOf(n, large, foot)).toEqual(sheets.slice(0, n));
    }
  });

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
