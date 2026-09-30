// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardStickerView } from "../boardSticker";
import { StickerTray, type StickerTrayHandle } from "./StickerTray";
import type { TrayBoard } from "./trayEngine";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let board: HTMLDivElement;
let root: Root;
const tray = createRef<StickerTrayHandle>();

const sticker = (
  id: string,
  arrivedAt: number,
  on: boolean,
  extra: Partial<BoardStickerView> = {},
): BoardStickerView => ({
  id,
  no: 1,
  createdAt: arrivedAt,
  arrivedAt,
  seenAt: null,
  timeUsed: 120,
  nsfw: false,
  width: 100,
  height: 80,
  // A stored cut line, so its shape is known without reading an image.
  outline: "M10.0 10.0L90.0 10.0L90.0 70.0L10.0 70.0Z",
  urls: { png: `${id}.png`, mask: `${id}-mask.png` },
  placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
  artist: { id: "me", handle: "you", name: "You", ageStatus: "adult" },
  held: true,
  givenTo: null,
  openGift: null,
  ...extra,
});
const api: TrayBoard = {
  stickerRect: () => null,
  sizeFor: () => ({ w: 100, h: 80 }),
  place: () => Promise.resolve(null),
  remove: () => {},
  pulse: () => {},
  openGiven: () => {},
};
const render = (
  stickers: BoardStickerView[],
  side: Partial<TrayBoard> = {},
  onSeen: (ids: readonly string[]) => void = () => {},
) =>
  act(() =>
    root.render(
      <StickerTray
        ref={tray}
        board={board}
        stickers={stickers}
        ownerId="me"
        api={{ ...api, ...side }}
        onSeen={onSeen}
      />,
    ),
  );
const openAndShut = async () => {
  await act(async () => void (await tray.current?.open()));
  await act(async () => void (await tray.current?.close()));
};
const slotOf = (id: string) => board.querySelector(`.tray__slot[data-id="${id}"]`);
const stateOf = (id: string) => slotOf(id)?.getAttribute("data-state");
/** One finger's move at (x, y) in board pixels: the board is drawn at its own size. */
const pointer = (on: Element | null, type: string, x: number, y: number, pointerId = 1) =>
  act(() => {
    on?.dispatchEvent(new PointerEvent(type, { pointerId, clientX: x, clientY: y, bubbles: true }));
  });
const stackEl = () => board.querySelector(".tray__stack");
const frontSheet = () => board.querySelector(".tray__stack .tray__sheet.is-top");
const pulledSheet = () => board.querySelector(".tray__pulled");
const flyers = () => board.querySelectorAll(".tray__flyer");
const openTray = () => act(async () => void (await tray.current?.open()));
/** Every animation ends as it starts, so what waits on one plays out. */
const endAnimationsAtOnce = () =>
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
    const a = new Animation();
    a.finish();
    return a;
  });
/** The front sheet dragged out over the board by its paper, where it settles. */
const pullOut = async () => {
  pointer(frontSheet()?.querySelector(".tray__paper") ?? null, "pointerdown", 300, 300);
  pointer(stackEl(), "pointermove", 180, 300);
  pointer(stackEl(), "pointerup", 180, 300);
  await act(async () => {});
  return pulledSheet();
};
/** A sticker on `sheet` pressed and drawn out toward the board, free of its sheet. */
const peelFrom = (sheet: Element | null, on: Element | null = sheet, pointerId = 1) => {
  const slot = sheet?.querySelector('.tray__slot[data-state="here"]') ?? null;
  pointer(slot, "pointerdown", 100, 200, pointerId);
  pointer(on, "pointermove", 40, 200, pointerId);
  return slot?.getAttribute("data-id");
};
/**
 * Reduced motion until `animate` turns it off, and animations that end only when `finishAll` ends
 * them, so a page turn can be caught partway.
 */
const holdAnimations = () => {
  let reduce = true;
  const motion = window.matchMedia("all");
  Object.defineProperty(motion, "matches", { get: () => reduce });
  vi.spyOn(window, "matchMedia").mockReturnValue(motion);
  const held: Animation[] = [];
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
    const a = new Animation();
    held.push(a);
    return a;
  });
  return {
    animate: () => {
      reduce = false;
    },
    finishAll: async () => {
      while (held.length) {
        for (const a of held.splice(0)) a.finish();
        await act(async () => {});
      }
    },
  };
};
const pageDown = () =>
  act(() => {
    stackEl()?.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
  });
/** Enough stickers for more than one sheet. */
const manyStickers = (n: number) =>
  Array.from({ length: n }, (_, i) => sticker(`s${i}`, i + 1, false));

beforeEach(() => {
  // Reduced motion: the tray opens and shuts at once. happy-dom's own animations reject unhandled.
  vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  // happy-dom lays nothing out: every box is given the board's size, so the Zipper draws its mouth.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(657);
  host = document.createElement("div");
  board = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 390, 657));
  document.body.append(host, board);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  board.remove();
  vi.restoreAllMocks();
});

describe("StickerTray", () => {
  it("follows the board's stickers, catching up as it shows, and leaves with the board", async () => {
    render([sticker("a", 1, true), sticker("b", 2, false)]);
    expect(stateOf("a")).toBe("used");
    expect(stateOf("b")).toBe("here");

    const drawn = slotOf("a");
    render([sticker("a", 1, false), sticker("b", 2, false)]);
    // Shut, the change waits for it to show.
    expect(slotOf("a")).toBe(drawn);
    await act(async () => void (await tray.current?.open()));
    expect(stateOf("a")).toBe("here");

    act(() => root.unmount());
    expect(board.querySelector(".tray")).toBeNull();
  });

  it("refuses a second drop of a sticker already on its way into its used sticker silhouette", async () => {
    const remove = vi.fn();
    render([sticker("a", 1, true)], { remove });
    // Let go at the shut tray's edge: it opens for the sticker before taking it.
    const atEdge = { x: 380, y: 300 };
    let first = Promise.resolve(false);
    let again = Promise.resolve(true);
    await act(async () => {
      first = tray.current?.boardDrop("a", atEdge) ?? first;
      again = tray.current?.boardDrop("a", atEdge) ?? again;
      await first;
    });
    expect(await again).toBe(false);
    expect(await first).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("leaves a given sticker's blank spot, a button that opens it among the stickers you gave", async () => {
    const openGiven = vi.fn();
    const bob = { id: "bob", handle: "bob", name: "Bob", ageStatus: "adult" as const };
    render(
      [
        sticker("given", 1, false, { held: false, givenTo: { receiver: bob, receivedAt: 2 } }),
        sticker("sent", 3, false, { openGift: { id: "g", status: "sent" } }),
      ],
      { openGiven },
    );
    await act(async () => void (await tray.current?.open()));
    const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="given"]');
    expect(spot?.getAttribute("aria-label")).toBe("No.0001, given to @bob. Open it");
    // Blank: nothing of the sticker shows, and it takes the shared press.
    expect(spot?.children).toHaveLength(0);
    expect(spot?.getAttribute("data-press")).toBe("");
    // A sticker on its way leaves nothing to tap: the pending gifts badge holds it.
    expect(slotOf("sent")).toBeNull();

    act(() => spot?.click());
    expect(openGiven).toHaveBeenCalledExactlyOnceWith("given");
  });

  it("puts a sticker in hand back on its pulled-out sheet when the sheet is sent home", async () => {
    endAnimationsAtOnce();
    const place = vi.fn((_id: string) => Promise.resolve(null));
    render([sticker("a", 1, false), sticker("b", 2, false)], { place });
    await openTray();
    const pulled = await pullOut();
    const peeled = peelFrom(pulled);
    expect(flyers()).toHaveLength(1);

    // Escape shuts the tray with the finger still down: the sheet goes home with its sticker.
    act(() => {
      board
        .querySelector(".tray")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(flyers()).toHaveLength(0);
    expect(stateOf(peeled ?? "")).toBe("here");

    // The tray takes the next press: a tap sticks a sticker on, at a free spot.
    await openTray();
    const tapped = frontSheet()?.querySelector('.tray__slot[data-state="here"]') ?? null;
    pointer(tapped, "pointerdown", 100, 200);
    pointer(stackEl(), "pointerup", 100, 200);
    expect(place).toHaveBeenCalledExactlyOnceWith(tapped?.getAttribute("data-id"), undefined);
  });

  it("ignores a second finger on the pulled-out sheet while a sticker is peeled from the stack", async () => {
    endAnimationsAtOnce();
    const place = vi.fn((_id: string) => Promise.resolve(null));
    render(manyStickers(30), { place });
    await openTray();
    const pulled = await pullOut();
    const peeled = peelFrom(frontSheet(), stackEl());

    // A tap on the pulled-out sheet by another finger.
    const other = pulled?.querySelector('.tray__slot[data-state="here"]') ?? null;
    pointer(other, "pointerdown", 100, 100, 2);
    pointer(pulled, "pointerup", 100, 100, 2);

    // The peel still ends where its own finger lifts: over the board, where it's stuck on.
    pointer(stackEl(), "pointerup", 40, 200);
    await act(async () => {});
    expect(place).toHaveBeenCalledExactlyOnceWith(peeled, expect.anything());
    expect(flyers()).toHaveLength(0);
  });

  it("catches up with stickers that changed under a hand once it lets go", async () => {
    render([sticker("a", 1, false), sticker("b", 2, false)]);
    await openTray();
    pointer(frontSheet()?.querySelector(".tray__paper") ?? null, "pointerdown", 300, 300);
    render([sticker("a", 1, true), sticker("b", 2, false)]);
    pointer(stackEl(), "pointerup", 300, 300);
    await act(async () => {});
    expect(stateOf("a")).toBe("used");
  });

  it("keeps a sticker in hand off its pulled-out sheet while the stickers change", async () => {
    endAnimationsAtOnce();
    render([sticker("a", 1, false), sticker("b", 2, false)]);
    await openTray();
    const pulled = await pullOut();
    const peeled = peelFrom(pulled);
    const other = peeled === "a" ? "b" : "a";
    render([sticker("a", 1, other === "a"), sticker("b", 2, other === "b")]);
    expect(stateOf(peeled ?? "")).toBe("peeling");
  });

  it("turns one sheet at a time, however fast PageDown comes", async () => {
    const motion = holdAnimations();
    render(manyStickers(30));
    await openTray();
    motion.animate();
    const next = board.querySelector(".tray__stack .tray__sheet.is-next")?.getAttribute("data-f");
    pageDown();
    pageDown();
    await motion.finishAll();
    expect(frontSheet()?.getAttribute("data-f")).toBe(next);
  });

  it("keeps the newest match in front when a folder tab is chosen mid-turn", async () => {
    const motion = holdAnimations();
    const friend = { id: "friend", handle: "friend", name: "Friend", ageStatus: "adult" as const };
    render(manyStickers(30).map((s) => ({ ...s, artist: friend })));
    await openTray();
    motion.animate();
    const newest = frontSheet()?.getAttribute("data-f");
    pageDown();
    act(() => board.querySelector<HTMLElement>('.tray__tab[data-filter="gifts"]')?.click());
    await motion.finishAll();
    expect(frontSheet()?.getAttribute("data-f")).toBe(newest);
  });

  it("reports what the open tray showed as seen once it shuts, once", async () => {
    const onSeen = vi.fn();
    const now = Date.now();
    render([sticker("new", now, false), sticker("seen", now, false, { seenAt: now })], {}, onSeen);
    await openAndShut();
    expect(onSeen).toHaveBeenCalledExactlyOnceWith(["new"]);
    await openAndShut();
    expect(onSeen).toHaveBeenCalledTimes(1);
  });
});
