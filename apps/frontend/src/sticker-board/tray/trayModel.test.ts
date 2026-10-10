import { describe, expect, it } from "vitest";
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
  /** `n` stickers in arrival order, their cut lines of varied sizes, as drawn stickers' are. */
  const stickers = (n: number) =>
    Array.from({ length: n }, (_, i): TraySticker => {
      const w = 100 + ((i * 37) % 120);
      const h = 100 + ((i * 53) % 140);
      const id = `packed-${i}`;
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
  /** Each sticker's sheet, as the tray packs `n` stickers for an open pouch ending at `foot`. */
  const sheetsOf = (n: number, large: boolean, foot: number) => {
    const ui = createTrayState(modelOf(stickers(n), new Set()));
    ui.fit = trayFitFor(large, () => foot);
    createTrayModel(ui, new Set(), () => {}).applyPack();
    return ui.model.slots.map((s) => s.sheet);
  };

  it("never moves a sticker to another sheet as more arrive, on a board of any height", () => {
    const most = 40;
    const sheets = sheetsOf(most, false, 640);
    expect(new Set(sheets).size).toBeGreaterThan(2);
    // From the shortest board the tray is made for to a tall large screen.
    const boards = [
      ...[420, 520, 640, 760, 900].map((foot) => [false, foot] as const),
      ...[560, 800, 1100, 1400].map((foot) => [true, foot] as const),
    ];
    for (const [large, foot] of boards)
      for (let n = 1; n <= most; n++) expect(sheetsOf(n, large, foot)).toEqual(sheets.slice(0, n));
  });
});
