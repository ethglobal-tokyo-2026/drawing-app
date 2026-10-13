// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canGiveTo } from "../stickers/nsfw";
import type { KeptSticker } from "../stickers/useKeptStickers";
import { StickerPicker } from "./StickerPicker";

let host: HTMLDivElement;
let root: Root;
const onPick = vi.fn();

const kept = (no: number, nsfw: boolean, veiled = false): KeptSticker => ({
  id: `s-${no}`,
  no,
  createdAt: 0,
  timeUsed: 60,
  width: 100,
  height: 100,
  url: `blob:${no}`,
  nsfw,
  veiled,
});

const showPicker = (
  stickers: KeptSticker[],
  picked: string | null = null,
  blocked: (sticker: KeptSticker) => boolean = () => false,
) =>
  act(() =>
    root.render(
      <StickerPicker
        stickers={stickers}
        picked={picked}
        onPick={onPick}
        label="Your stickers"
        blocked={blocked}
      />,
    ),
  );

const tiles = () => [...host.querySelectorAll<HTMLButtonElement>("[role=radio]")];
const pressKey = (tile: HTMLButtonElement, key: string) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => {
    tile.dispatchEvent(event);
  });
  return event;
};

const pickFor = (recipientOptedIn: boolean) => {
  act(() =>
    root.render(
      <StickerPicker
        stickers={[kept(1, false), kept(2, true)]}
        picked={null}
        onPick={onPick}
        label="Your stickers"
        blocked={(s) => !canGiveTo(s, recipientOptedIn)}
      />,
    ),
  );
  for (const tile of host.querySelectorAll("button")) act(() => tile.click());
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onPick.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("StickerPicker", () => {
  it("has one tab stop on the selected eligible sticker, or the first eligible sticker", () => {
    const stickers = [kept(1, true), kept(2, false), kept(3, false)];
    const blocked = (s: KeptSticker) => s.nsfw;
    showPicker(stickers, null, blocked);
    expect(tiles().map((tile) => tile.tabIndex)).toEqual([-1, 0, -1]);

    showPicker(stickers, "s-3", blocked);
    expect(tiles().map((tile) => tile.tabIndex)).toEqual([-1, -1, 0]);

    showPicker(stickers, "s-1", blocked);
    expect(tiles().map((tile) => tile.tabIndex)).toEqual([-1, 0, -1]);
  });

  it.each([
    ["ArrowRight", 0, 2],
    ["ArrowDown", 0, 2],
    ["ArrowLeft", 2, 0],
    ["ArrowUp", 2, 0],
    ["ArrowRight", 3, 0],
    ["ArrowDown", 3, 0],
    ["ArrowLeft", 0, 3],
    ["ArrowUp", 0, 3],
  ] as const)(
    "%s moves focus and selection from tile %i to %i, skipping blocked stickers",
    (key, at, next) => {
      const stickers = [kept(1, false), kept(2, true), kept(3, false), kept(4, false)];
      const blocked = (s: KeptSticker) => s.nsfw;
      onPick.mockImplementation((id: string) => showPicker(stickers, id, blocked));
      showPicker(stickers, stickers[at].id, blocked);
      tiles()[at].focus();

      const event = pressKey(tiles()[at], key);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(tiles()[next]);
      expect(onPick).toHaveBeenCalledExactlyOnceWith(stickers[next].id);
      expect(tiles().filter((tile) => tile.tabIndex === 0)).toEqual([tiles()[next]]);
      expect(tiles()[next].getAttribute("aria-checked")).toBe("true");
    },
  );

  it.each([
    ["Home", 0],
    ["End", 3],
  ] as const)("%s selects the %i eligible endpoint", (key, next) => {
    showPicker(
      [kept(1, false), kept(2, true), kept(3, false), kept(4, false)],
      "s-3",
      (s) => s.nsfw,
    );
    tiles()[2].focus();

    expect(pressKey(tiles()[2], key).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tiles()[next]);
    expect(onPick).toHaveBeenCalledExactlyOnceWith(`s-${next + 1}`);
  });

  it("leaves unrelated keys to the browser and does not trap an all-blocked picker", () => {
    showPicker([kept(1, false), kept(2, false)]);
    tiles()[0].focus();
    expect(pressKey(tiles()[0], "Tab").defaultPrevented).toBe(false);
    expect(pressKey(tiles()[0], " ").defaultPrevented).toBe(false);
    expect(pressKey(tiles()[0], "Enter").defaultPrevented).toBe(false);
    expect(onPick).not.toHaveBeenCalled();

    showPicker([kept(1, true), kept(2, true)], null, (s) => s.nsfw);
    expect(tiles().every((tile) => tile.tabIndex === -1)).toBe(true);
    tiles()[0].focus();
    expect(pressKey(tiles()[0], "ArrowRight").defaultPrevented).toBe(false);
    act(() => tiles()[0].click());
    expect(onPick).not.toHaveBeenCalled();
  });

  it("won't pick an NSFW sticker for someone without the NSFW opt-in, but picks their others", () => {
    pickFor(false);
    expect(onPick.mock.calls).toEqual([["s-1"]]);
  });

  it("picks an NSFW sticker for someone with it", () => {
    pickFor(true);
    expect(onPick.mock.calls).toEqual([["s-1"], ["s-2"]]);
  });

  it("marks a sticker that's blurred for you with 18+, and still picks it", () => {
    act(() =>
      root.render(
        <StickerPicker
          stickers={[kept(1, false), kept(2, true, true)]}
          picked={null}
          onPick={onPick}
          label="Your stickers"
        />,
      ),
    );
    const [plain, blurred] = [...host.querySelectorAll("button")];
    expect(plain?.querySelector(".nsfw-mark")).toBeNull();
    expect(blurred?.querySelector(".nsfw-mark")?.textContent).toBe("18+");
    expect(blurred?.getAttribute("aria-label")).toContain("Blurred: 18+ sticker");
    act(() => blurred?.click());
    expect(onPick.mock.calls).toEqual([["s-2"]]);
  });
});
