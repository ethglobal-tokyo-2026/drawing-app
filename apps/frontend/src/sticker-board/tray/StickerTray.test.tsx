// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
  type MockInstance,
} from "vitest";
import { TEST_KYOTO_SEIKA_SUBJECTS } from "../../api/testFixtures";
import { forgetBoardComplete, markBoardComplete, QUIET_MS } from "../boardComplete";
import { i18next } from "../../i18n/i18n";
import { errors } from "../../i18n/strings/errors";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import type { BoardStickerView } from "../boardSticker";
import { StickerTray, type StickerTrayHandle } from "./StickerTray";
import { ICONS, TUG_VISITS, type TrayBoard } from "./trayEngine";
import { LARGE_SCREEN } from "../../ui/largeScreen";
import {
  MAX_STACK_SCALE,
  POUCH_LINING,
  SHEET,
  STACK_FOOT,
  stackFootFor,
  trayTopFor,
} from "./trayModel";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import { NUDGE_AFTER } from "./trayNudge";
import { trayProblemWords, type TrayProblem } from "./trayProblem";
import { countVisit } from "./traySeen";
import { stubResizeObservers } from "../../ui/testing";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let board: HTMLDivElement;
/** How often the board's place on screen has been read. */
let boardReads: MockInstance<() => DOMRect>;
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
  drawnWidth: 480,
  drawnHeight: 480,
  nsfw: false,
  kyotoSeikaSubjects: null,
  width: 100,
  height: 80,
  // A stored cut line, so its shape is known without reading an image.
  outline: "M10.0 10.0L90.0 10.0L90.0 70.0L10.0 70.0Z",
  urls: testStickerUrls(id),
  placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
  placements: { phone: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 }, large: null },
  artist: { id: "me", handle: "you", name: "You", nsfwOptIn: false },
  held: true,
  hasTimelapse: false,
  trail: { timesGiven: 0, newestHasGratitude: false },
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
  openYours: () => {},
};
const render = (
  stickers: BoardStickerView[],
  side: Partial<TrayBoard> = {},
  onSeen: (ids: readonly string[]) => void = () => {},
  onProblem: (problem: TrayProblem) => void = () => {},
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
        onProblem={onProblem}
      />,
    ),
  );
const openAndShut = async () => {
  await act(async () => void (await tray.current?.open()));
  await act(async () => void (await tray.current?.close()));
};
const slotOf = (id: string) => board.querySelector(`.tray__slot[data-id="${id}"]`);
const stateOf = (id: string) => slotOf(id)?.getAttribute("data-state");
/** A sticker's dot badge, NEW or its gift's, in its sheet's layer of dots. */
const dotOf = (id: string) =>
  board.querySelector<HTMLElement>(`.tray__dot-spot[data-id="${id}"] > *`);
/** One finger's move at (x, y) in board pixels: the board is drawn at its own size. */
const pointer = (on: Element | null, type: string, x: number, y: number, pointerId = 1) =>
  act(() => {
    on?.dispatchEvent(new PointerEvent(type, { pointerId, clientX: x, clientY: y, bubbles: true }));
  });
const stackEl = () => board.querySelector<HTMLElement>(".tray__stack");
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
/** happy-dom's own matchMedia, before any test spies on it. */
const unspiedMatchMedia = window.matchMedia.bind(window);
/** The screen's media queries: reduced motion as `motion` answers, and a phone's screen unless `large`. */
const media = (motion: MediaQueryList, large = false) => {
  const screen = unspiedMatchMedia(large ? "all" : "(max-width: 1px)");
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === LARGE_SCREEN ? screen : motion,
  );
};
/**
 * Reduced motion until `animate` turns it off (or back on), and animations that end only when
 * `finishAll` ends them, so a page turn can be caught partway. `asked` keeps every animation with the
 * element and keyframes it was asked for.
 */
const holdAnimations = () => {
  let reduce = true;
  const motion = window.matchMedia("all");
  Object.defineProperty(motion, "matches", { get: () => reduce });
  media(motion);
  const held: Animation[] = [];
  const asked: {
    el: Element;
    frames: Keyframe[] | PropertyIndexedKeyframes | null;
    a: Animation;
  }[] = [];
  vi.spyOn(Element.prototype, "animate").mockImplementation(function (
    this: Element,
    frames: Keyframe[] | PropertyIndexedKeyframes | null,
  ) {
    const a = new Animation();
    held.push(a);
    asked.push({ el: this, frames, a });
    return a;
  });
  return {
    animate: (on = true) => {
      reduce = !on;
    },
    asked,
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
const friend = { id: "friend", handle: "friend", name: "Friend", nsfwOptIn: false };
const bob = { id: "bob", handle: "bob", name: "Bob", nsfwOptIn: false };
/** A sticker someone has received: no longer held, its spot left on its sheet. */
const givenSticker = (id: string, arrivedAt: number) =>
  sticker(id, arrivedAt, false, {
    held: false,
    givenTo: { receiver: bob, receivedAt: arrivedAt + 1 },
  });
/** A sticker on its way to someone: its gift is sent, and not yet received. */
const sentSticker = (id: string, arrivedAt: number) =>
  sticker(id, arrivedAt, false, { openGift: { id: `gift-${id}`, status: "sent" } });
/** The points of an SVG path of straight segments, as [x, y] pairs. */
const pathPoints = (d: string | null | undefined): [number, number][] => {
  const numbers = (d?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return Array.from({ length: numbers.length >> 1 }, (_, i): [number, number] => [
    numbers[2 * i] ?? NaN,
    numbers[2 * i + 1] ?? NaN,
  ]);
};
/** Stickers spread over several sheets, every third one a gift, so the folder tabs show. */
const stickersWithGifts = (n: number) =>
  manyStickers(n).map((s, i) => (i % 3 === 0 ? { ...s, artist: friend } : s));
/** What Tab and a screen reader meet in the open tray, in page order. */
const stops = () =>
  [...board.querySelectorAll<HTMLElement>(".tray__c2 button, .tray__c2 [tabindex='0']")].filter(
    (el) => !el.closest("[inert], [hidden]"),
  );
const kindOf = (el: HTMLElement) =>
  el.classList.contains("tray__tab")
    ? "tab"
    : el.classList.contains("tray__slot")
      ? "slot"
      : el.classList.contains("tray__foot")
        ? "foot"
        : "more";

beforeEach(() => {
  // Each test starts with a board that hasn't assembled, as a new page would.
  forgetBoardComplete();
  // Reduced motion: the tray opens and shuts at once. happy-dom's own animations reject unhandled.
  media(window.matchMedia("all"));
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  // happy-dom lays nothing out: every box is given the board's size, so the Zipper draws its mouth.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(657);
  host = document.createElement("div");
  board = document.createElement("div");
  boardReads = vi
    .spyOn(board, "getBoundingClientRect")
    .mockReturnValue(new DOMRect(0, 0, 390, 657));
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

  it("follows the board's size as it resizes, for a sticker dragged to the shut tray's edge", () => {
    const observers = stubResizeObservers();
    render([sticker("a", 1, true)]);
    const atEdge = (x: number) => tray.current?.boardDrag("a", { x, y: 600 })?.over;
    expect(atEdge(370)).toBe(true);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
    boardReads.mockReturnValue(new DOMRect(0, 0, 800, 657));
    act(() => observers.resize(board));
    expect(atEdge(370)).toBe(false);
    expect(atEdge(780)).toBe(true);
  });

  it("measures a board that moved without resizing as the next gesture begins, and never mid-drag", () => {
    render([sticker("a", 1, true)]);
    const reads = () => boardReads.mock.calls.length;
    const moved = new DOMRect(0, 120, 390, 657);
    boardReads.mockReturnValue(moved);
    const before = reads();
    pointer(board, "pointerdown", 200, 300);
    expect(reads()).toBe(before + 1);
    tray.current?.boardDrag("a", { x: 200, y: 300 });
    tray.current?.boardDrag("a", { x: 380, y: 600 });
    expect(reads()).toBe(before + 1);
    expect(boardReads.mock.results.at(-1)?.value).toBe(moved);
  });

  it("measures a board that moved as a key sticks a sticker on, so its flyer starts where the sticker is", async () => {
    render(manyStickers(8), { place: () => new Promise<HTMLElement | null>(() => {}) });
    await openTray();
    const enterOnSticker = () =>
      act(() => {
        frontSheet()
          ?.querySelector('.tray__slot[data-state="here"]')
          ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
    /** The y a flyer starts at, in board pixels, from its transform. */
    const startY = (flyer: Element | undefined) =>
      Number(
        /translate\([-\d.]+px,([-\d.]+)px\)/.exec(
          flyer instanceof HTMLElement ? flyer.style.transform : "",
        )?.[1],
      );
    enterOnSticker();
    boardReads.mockReturnValue(new DOMRect(0, 120, 390, 657));
    enterOnSticker();
    // Both stickers are at the same place on screen, and the board moved down under the second.
    const [first, second] = flyers();
    expect(startY(first) - startY(second)).toBeCloseTo(120);
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

  it("stays shut for a sticker held at its edge whose drag ends without a drop, or shuts again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onTestFinished(() => void vi.useRealTimers());
    render([sticker("a", 1, true)]);
    const atEdge = { x: 380, y: 600 };
    const wait = () => act(async () => void (await vi.advanceTimersByTimeAsync(1000)));

    tray.current?.boardDrag("a", atEdge);
    tray.current?.boardDragEnd("a");
    await wait();
    expect(tray.current?.isOpen).toBe(false);

    // Held there long enough, it opens for the sticker; the drag ending shuts it again.
    tray.current?.boardDrag("a", atEdge);
    await wait();
    expect(tray.current?.isOpen).toBe(true);
    tray.current?.boardDragEnd("a");
    await wait();
    expect(tray.current?.isOpen).toBe(false);
  });

  it("leaves a given sticker's spot, a button that opens it among the stickers you gave", async () => {
    const openGiven = vi.fn();
    render([givenSticker("given", 1)], { openGiven });
    await act(async () => void (await tray.current?.open()));
    const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="given"]');
    expect(spot?.getAttribute("aria-label")).toBe("No.0001, given to @bob. Open it");
    // Nothing of the sticker shows, and it takes the shared press.
    expect(spot?.querySelector(".tray__fit, .tray__img")).toBeNull();
    expect(spot?.getAttribute("data-press")).toBe("");

    act(() => spot?.click());
    expect(openGiven).toHaveBeenCalledExactlyOnceWith("given");
  });

  it("traces a given sticker's own cut line on its spot", async () => {
    render([givenSticker("given", 1), sentSticker("sent", 3)]);
    await openTray();
    const outlines = board.querySelectorAll('.tray__slot[data-id="given"] .tray__given-outline');
    const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="given"]');
    expect(outlines).toHaveLength(1);
    expect(spot?.contains(outlines[0] ?? null)).toBe(true);

    // The fixture's cut is inset in its image: traced from it, no point lies on the spot's edge.
    const w = Number.parseFloat(spot?.style.width ?? "");
    const h = Number.parseFloat(spot?.style.height ?? "");
    const points = pathPoints(outlines[0]?.querySelector("path")?.getAttribute("d"));
    expect(points.length).toBeGreaterThan(2);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(w);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(h);
    }
  });

  it.each([
    ["in the bag", "packed", "inTheBag", "No.0001, in the bag. Open it"],
    ["on its way", "sent", "onItsWay", "No.0001, on its way. Open it"],
  ] as const)(
    "shows a sticker %s under frost in its spot, with its dot, which a tap opens among your stickers and nothing peels",
    async (_, status, state, name) => {
      const openYours = vi.fn();
      const place = vi.fn((_id: string) => Promise.resolve(null));
      // Stuck on before it was packed, it still waits in its spot.
      render(
        [sticker("gift", 3, true, { openGift: { id: "g", status } }), sticker("newer", 4, false)],
        { openYours, place },
      );
      await openTray();
      const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="gift"]');
      expect(spot?.getAttribute("aria-label")).toBe(name);
      expect(spot?.querySelector(".tray__frost")).not.toBeNull();
      expect(spot?.querySelector(".tray__given-outline")).not.toBeNull();
      const dot = dotOf("gift");
      expect(dot?.querySelector("path")?.getAttribute("d")).toBe(ICONS[state]);
      // It sticks on its cut line's corner, not on the empty corner of its image.
      expect(["--spot-x", "--spot-y"].map((p) => Number(dot?.style.getPropertyValue(p)))).toEqual([
        0.9, 0.125,
      ]);
      // Its dot lies over the newer sticker beside it, which comes before the dot in the page.
      const newer = slotOf("newer");
      if (!dot || !newer) throw new Error("The dot or the newer sticker isn't on the sheet");
      expect(newer.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      pointer(spot, "pointerdown", 100, 200);
      pointer(stackEl(), "pointerup", 100, 200);
      act(() => spot?.click());
      expect(openYours).toHaveBeenCalledExactlyOnceWith("gift");
      // Drawn toward the board, it stays in its spot.
      pointer(spot, "pointerdown", 100, 200);
      pointer(stackEl(), "pointermove", 40, 200);
      expect(flyers()).toHaveLength(0);
      expect(place).not.toHaveBeenCalled();
    },
  );

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

  it("brings a sheet chosen mid-turn to the front once the turn is over", async () => {
    const motion = holdAnimations();
    render(manyStickers(60));
    await openTray();
    motion.animate();
    const edge = board.querySelector(".tray__stack > .tray__sheet[data-depth='2'] .tray__foot");
    const chosen = edge?.closest<HTMLElement>(".tray__sheet")?.dataset.f;
    pageDown();
    act(() => {
      edge?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await motion.finishAll();
    expect(chosen).toBeDefined();
    expect(frontSheet()?.getAttribute("data-f")).toBe(chosen);
  });

  it("keeps the newest match in front when a folder tab is chosen mid-turn", async () => {
    const motion = holdAnimations();
    render(manyStickers(30).map((s) => ({ ...s, artist: friend })));
    await openTray();
    motion.animate();
    const newest = frontSheet()?.getAttribute("data-f");
    pageDown();
    act(() => board.querySelector<HTMLElement>('.tray__tab[data-filter="gifts"]')?.click());
    await motion.finishAll();
    expect(frontSheet()?.getAttribute("data-f")).toBe(newest);
  });

  it("keeps the newest match in front when a folder tab is chosen mid-riffle", async () => {
    const motion = holdAnimations();
    render(stickersWithGifts(60));
    await openTray();
    motion.animate();
    const newest = frontSheet()?.getAttribute("data-f");
    // The deepest edge riffles through the sheets before it.
    const edge = board.querySelector(".tray__stack > .tray__sheet[data-depth='3'] .tray__foot");
    pointer(edge, "pointerdown", 100, 200);
    pointer(stackEl(), "pointerup", 100, 200);
    act(() => board.querySelector<HTMLElement>('.tray__tab[data-filter="gifts"]')?.click());
    await motion.finishAll();
    expect(frontSheet()?.getAttribute("data-f")).toBe(newest);
  });

  it("says on its one blank sheet what an empty tray is for, until a sticker arrives", async () => {
    render([]);
    expect(board.querySelector(".tray__empty")?.textContent).toBeTruthy();
    render([sticker("a", 1, false)]);
    // Shut, the sheets catch up as the tray shows.
    await openTray();
    expect(board.querySelector(".tray__empty")).toBeNull();
  });

  it("names its one blank sheet by its number alone, in front or pulled out, and describes nothing on it, until a sticker arrives", async () => {
    endAnimationsAtOnce();
    render([]);
    expect(frontSheet()?.getAttribute("aria-label")).toBe("Sheet 1, in front");
    expect(frontSheet()?.hasAttribute("aria-describedby")).toBe(false);
    await openTray();
    const pulled = await pullOut();
    expect(pulled?.querySelector(".tray__sheet")?.getAttribute("aria-label")).toBe(
      "Sheet 1, pulled out",
    );
    expect(pulled?.querySelector(".tray__sheet")?.hasAttribute("aria-describedby")).toBe(false);

    // The sheet goes home, and a sticker arrives: it has dates, and stickers to describe.
    await act(async () => void (await tray.current?.close()));
    render([sticker("a", 1, false)]);
    await openTray();
    expect(frontSheet()?.getAttribute("aria-label")).toMatch(/^Sheet 1, \S.*, in front$/);
    expect(frontSheet()?.hasAttribute("aria-describedby")).toBe(true);
  });

  it("counts a visit to the tray when it's opened, not when the board shows", async () => {
    const visits = () => localStorage.getItem("draw.tray.visits");
    localStorage.clear();
    render(manyStickers(8));
    expect(visits()).toBeNull();
    await openAndShut();
    await openAndShut();
    // Once for each time the board shows the tray opened, however often it opens meanwhile.
    expect(visits()).toBe("1");
  });

  describe("nudges the front sheet's grip", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const visitsBefore = (visits: number) => {
      localStorage.clear();
      for (let i = 0; i < visits; i++) countVisit();
    };
    /** The tray opens with motion off, so it opens at once; `motion` says when motion is on from there. */
    const openWithoutMotion = async () => {
      const motion = holdAnimations();
      render(manyStickers(8));
      await openTray();
      return motion;
    };
    const nudges = (motion: ReturnType<typeof holdAnimations>) =>
      motion.asked.filter(({ el }) => el.matches(".tray__sheet.is-top"));
    const pass = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    const waitForNudge = () => pass(NUDGE_AFTER);

    it("a moment after the tray opens, on an early visit, moving nothing but its transform", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = await openWithoutMotion();
      motion.animate();
      await pass(NUDGE_AFTER - 1);
      expect(nudges(motion)).toHaveLength(0);
      await pass(1);
      expect(nudges(motion)).toHaveLength(1);
      const frames = nudges(motion)[0]?.frames;
      const moved = new Set(Array.isArray(frames) ? frames.flatMap((f) => Object.keys(f)) : []);
      moved.delete("offset");
      moved.delete("easing");
      expect([...moved].toSorted()).toEqual(["transform"]);
    });

    it("not once the tray has been opened three times", async () => {
      visitsBefore(TUG_VISITS);
      const motion = await openWithoutMotion();
      motion.animate();
      await waitForNudge();
      expect(nudges(motion)).toHaveLength(0);
    });

    it("not under reduced motion", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = await openWithoutMotion();
      await waitForNudge();
      expect(nudges(motion)).toHaveLength(0);
    });

    /** The tray shuts and opens again at once as before, with motion on after. */
    const reopen = async (motion: ReturnType<typeof holdAnimations>) => {
      motion.animate(false);
      await act(async () => void (await tray.current?.close()));
      await openTray();
      motion.animate();
    };

    it("once a visit, however often the tray opens", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = await openWithoutMotion();
      motion.animate();
      await waitForNudge();
      await reopen(motion);
      await waitForNudge();
      expect(nudges(motion)).toHaveLength(1);
    });

    it("not once a hand has touched the open tray, nor when it opens again", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = await openWithoutMotion();
      motion.animate();
      pointer(stackEl(), "pointerdown", 100, 200);
      pointer(stackEl(), "pointerup", 100, 200);
      await waitForNudge();
      await reopen(motion);
      await waitForNudge();
      expect(nudges(motion)).toHaveLength(0);
    });

    it("and calls off one under way when a hand touches the tray", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = await openWithoutMotion();
      motion.animate();
      await waitForNudge();
      const cancel = vi.spyOn(nudges(motion)[0]?.a ?? new Animation(), "cancel");
      pointer(stackEl(), "pointerdown", 100, 200);
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it("though the touch that opened the tray doesn't count", async () => {
      visitsBefore(TUG_VISITS - 1);
      const motion = holdAnimations();
      render(manyStickers(8));
      pointer(board.querySelector(".zip__slider"), "pointerdown", 380, 300);
      await openTray();
      motion.animate();
      await waitForNudge();
      expect(nudges(motion)).toHaveLength(1);
    });
  });

  it("fades the stack's foot while a sheet out over the board leaves the mouth a crack", async () => {
    endAnimationsAtOnce();
    render(manyStickers(30));
    await openTray();
    const foot = () => Number.parseFloat(stackEl()?.style.getPropertyValue("--foot") || "1");
    expect(foot()).toBe(1);
    await pullOut();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });
    expect(foot()).toBeLessThan(1);
  });

  it("reads the board's place once for a gesture, however many moves it makes", async () => {
    endAnimationsAtOnce();
    const reads = () => boardReads.mock.calls.length;
    const peelWith = async (moves: number) => {
      render(manyStickers(30));
      await openTray();
      const slot = frontSheet()?.querySelector<HTMLElement>('.tray__slot[data-state="here"]');
      const before = reads();
      pointer(slot ?? null, "pointerdown", 100, 200);
      for (let i = 1; i <= moves; i++) pointer(stackEl(), "pointermove", 100 - i * 12, 200);
      pointer(stackEl(), "pointerup", 100 - moves * 12, 200);
      await act(async () => {});
      return reads() - before;
    };
    const few = await peelWith(5);
    expect(await peelWith(30)).toBe(few);
  });

  describe("tells the board what it couldn't do", () => {
    const problems: TrayProblem[] = [];
    beforeEach(() => {
      problems.length = 0;
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    const stickOnFirst = async () => {
      await openTray();
      const slot = frontSheet()?.querySelector<HTMLElement>('.tray__slot[data-state="here"]');
      act(() => {
        slot?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
      await act(async () => {});
      return slot?.dataset.id;
    };

    it("when the board can't take a sticker, which goes back to its sheet", async () => {
      render(manyStickers(8), {}, undefined, (p) => problems.push(p));
      const id = await stickOnFirst();
      expect(problems.map((p) => [p.kind, p.nos, trayProblemWords(p).reason !== ""])).toEqual([
        ["place", [1], true],
      ]);
      expect(stateOf(id ?? "")).toBe("here");
    });

    it("when placing a sticker fails, in the app's words with the error's own for a report", async () => {
      const place = () => Promise.reject(new Error("the connection is asleep"));
      render(manyStickers(8), { place }, undefined, (p) => problems.push(p));
      await stickOnFirst();
      expect(problems.map(trayProblemWords)).toEqual([
        { reason: errors.unexpected.en, detail: "Error: the connection is asleep" },
      ]);
    });

    it("when a sticker's cut line can't be read, once, and packs it as a box", () => {
      const cutless = sticker("cutless", 1, false, { outline: "M0 0" });
      render([cutless], {}, undefined, (p) => problems.push(p));
      render([cutless, sticker("b", 2, false)], {}, undefined, (p) => problems.push(p));
      expect(problems.filter((p) => p.kind === "cut")).toHaveLength(1);
      expect(problems[0]?.nos).toEqual([1]);
    });
  });

  it("puts the Kyoto Seika Practice Mode foil on a sticker drawn in Kyoto Seika Practice Mode, your own too, and pink foil on an NSFW one", async () => {
    const kyotoSeikaSubjects = TEST_KYOTO_SEIKA_SUBJECTS;
    render([
      sticker("kyoto-seika", 1, false, { kyotoSeikaSubjects }),
      sticker("nsfw", 2, false, { kyotoSeikaSubjects, nsfw: true }),
      sticker("plain", 3, false),
    ]);
    await openTray();
    const foilOn = (id: string) => slotOf(id)?.querySelector(".sticker-foil");
    expect(foilOn("kyoto-seika")?.matches(".sticker-foil--sheet.sticker-foil--kyoto-seika")).toBe(
      true,
    );
    expect(foilOn("nsfw")?.matches(".sticker-foil--pink:not(.sticker-foil--kyoto-seika)")).toBe(
      true,
    );
    expect(foilOn("plain")).toBeNull();
  });

  describe("asks for its sticker images", () => {
    const imageCount = () => board.querySelectorAll(".tray__img").length;
    const masked = () =>
      board.querySelector<HTMLElement>(".tray__fit")?.style.getPropertyValue("--m");

    it("only once the tray first shows, so a closed tray downloads nothing beside the board", async () => {
      render(manyStickers(8));
      expect(imageCount()).toBe(0);
      expect(masked()).toBe("");
      await openTray();
      expect(imageCount()).toBeGreaterThan(0);
      expect(masked()).toContain("-mask.png");
    });

    it("or once the board has assembled and had its quiet second, the tray still shut", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout"] });
      try {
        render(manyStickers(8));
        markBoardComplete();
        expect(imageCount()).toBe(0);
        await vi.advanceTimersByTimeAsync(QUIET_MS + 10);
        expect(imageCount()).toBeGreaterThan(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("says in its one polite status line", () => {
    const statusText = () => board.querySelector('[role="status"]')?.textContent;

    it("how many sheets a folder tab shows", async () => {
      render(stickersWithGifts(30));
      await openTray();
      expect(statusText()).toBe("");
      act(() => board.querySelector<HTMLElement>('.tray__tab[data-filter="gifts"]')?.click());
      expect(statusText()).toMatch(/^Gifts: \d+ sheets?$/);
    });

    it("which sheet is in front after paging", async () => {
      render(manyStickers(30));
      await openTray();
      pageDown();
      await act(async () => {});
      expect(statusText()).toBe(
        `Sheet ${Number(frontSheet()?.getAttribute("data-f")) + 1}, ${
          frontSheet()?.querySelector(".tray__foot .fine")?.textContent
        }, in front`,
      );
    });

    it("that a sticker is on the board once it's stuck on", async () => {
      // The board answers with the sticker's element once it has drawn it.
      render(manyStickers(8), { place: () => Promise.resolve(document.createElement("div")) });
      await openTray();
      const slot = frontSheet()?.querySelector<HTMLElement>('.tray__slot[data-state="here"]');
      const no = slot?.getAttribute("aria-label");
      act(() => {
        slot?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
      await act(async () => {});
      expect(statusText()).toBe(`${no} is on your board`);
    });

    it("that a sticker is back in the tray once it's put back", async () => {
      render([sticker("a", 1, true)]);
      await act(async () => void (await tray.current?.boardDrop("a", { x: 380, y: 300 })));
      expect(statusText()).toBe("No.0001 is back in your tray");
    });
  });

  it("brings forward the edge a press falls in the share of, though it lands below its thin strip", async () => {
    render(manyStickers(60));
    await openTray();
    const deepest = board.querySelector<HTMLElement>(".tray__stack > .tray__sheet[data-depth='3']");
    // The feet as a browser would lay them out: the front sheet's, then an edge every 15px.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const depth = this.closest<HTMLElement>(".tray__sheet")?.dataset.depth;
      const isFoot = this.classList.contains("tray__foot");
      return isFoot && depth !== undefined
        ? new DOMRect(0, 349 + 15 * Number(depth), 150, 15)
        : new DOMRect();
    });
    // Under the deepest edge's own strip, where nothing is drawn.
    pointer(stackEl(), "pointerdown", 100, 410.5);
    pointer(stackEl(), "pointerup", 100, 410.5);
    await act(async () => {});
    expect(frontSheet()?.getAttribute("data-f")).toBe(deepest?.getAttribute("data-f"));
  });

  it("keeps the stack drawn and focus on the sticker while the mouth sags to stick it on", async () => {
    render(manyStickers(8));
    await openTray();
    const window1 = board.querySelector(".tray__w1");
    let shutSeen = false;
    const watch = new MutationObserver(() => {
      if (window1?.classList.contains("is-shut")) shutSeen = true;
    });
    watch.observe(window1 ?? board, { attributes: true, attributeFilter: ["class"] });
    const slot = frontSheet()?.querySelector<HTMLElement>('.tray__slot[data-state="here"]');
    act(() => slot?.focus());

    // Enter sticks it on; the mouth's spring rings through shut and settles while frames run.
    act(() => {
      slot?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });
    watch.disconnect();
    expect(shutSeen).toBe(false);
    expect(stackEl()?.contains(document.activeElement)).toBe(true);
  });

  it("spreads the sheets as a named dialog of one button each, with the board inert behind it until it closes", async () => {
    render(manyStickers(60));
    const elsewhere = document.createElement("button");
    board.append(elsewhere);
    await openTray();
    act(() => board.querySelector<HTMLElement>(".tray__depth")?.click());

    const dialog = board.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute("aria-label")).toBeTruthy();
    const cells = dialog?.querySelectorAll(".tray__cell") ?? [];
    expect(cells.length).toBeGreaterThan(1);
    // Nothing nested in a sheet: the stickers on it are pictures.
    expect(dialog?.querySelectorAll("button")).toHaveLength(cells.length);
    expect(dialog?.hasAttribute("inert")).toBe(false);
    expect(elsewhere.hasAttribute("inert")).toBe(true);
    expect(board.querySelector(".tray__col")?.hasAttribute("inert")).toBe(true);
    // Opened from the keyboard, focus follows into the dialog.
    expect(document.activeElement).toBe(cells[0]);

    await act(async () => void tray.current?.escape());
    expect(dialog?.hidden).toBe(true);
    expect(elsewhere.hasAttribute("inert")).toBe(false);
    expect(board.querySelector(".tray__col")?.hasAttribute("inert")).toBe(false);
    expect(stackEl()?.contains(document.activeElement)).toBe(true);
  });

  it("returns focus to the stack when a tapped cell closes the spread, though the browser blurred the cell first", async () => {
    render(manyStickers(60));
    await openTray();
    act(() => board.querySelector<HTMLElement>(".tray__depth")?.click());
    const cells = board.querySelectorAll<HTMLElement>(".tray__cell");
    // WebKit takes focus off a tapped button before its click lands, which leaves it on the body.
    act(() => cells[0]?.blur());
    expect(document.activeElement).toBe(document.body);

    await act(async () => cells[2]?.click());
    expect(stackEl()?.contains(document.activeElement)).toBe(true);
  });

  it("keeps the sheet tapped in the spread in front, though Escape comes as the spread closes", async () => {
    const motion = holdAnimations();
    render(manyStickers(60));
    await openTray();
    motion.animate();
    act(() => board.querySelector<HTMLElement>(".tray__depth")?.click());
    const tapped = board.querySelectorAll<HTMLElement>(".tray__cell")[2];
    act(() => tapped?.click());
    act(() => void tray.current?.escape());
    await motion.finishAll();
    expect(frontSheet()?.getAttribute("data-f")).toBe(tapped?.dataset.f);
  });

  it("takes the folder tabs, then the front sheet's stickers, then the edges of the sheets behind in Tab order, and nothing hidden", async () => {
    // Enough sheets for the +N button.
    render(stickersWithGifts(60));
    await openTray();
    const list = stops();
    // Each kind once in a row: no sticker from a sheet behind sits among them.
    const kinds = list.map(kindOf).filter((kind, i, all) => kind !== all[i - 1]);
    expect(kinds).toEqual(["tab", "slot", "foot", "more"]);
    for (const el of list.filter((e) => kindOf(e) === "slot"))
      expect(el.closest<HTMLElement>(".tray__sheet")?.dataset.depth).toBe("0");
    // Their edges, shallow to deep, and every one named.
    const feet = list.filter((e) => kindOf(e) === "foot");
    expect(feet.map((e) => e.closest<HTMLElement>(".tray__sheet")?.dataset.depth)).toEqual(
      feet.map((_, i) => String(i + 1)),
    );
    for (const foot of feet) expect(foot.getAttribute("aria-label")).toMatch(/^Sheet \d+, /);
  });

  it("names the sheet in front and says once what its stickers do", async () => {
    render(manyStickers(30));
    await openTray();
    const front = frontSheet();
    expect(front?.getAttribute("role")).toBe("group");
    expect(front?.getAttribute("aria-label")).toMatch(/^Sheet \d+, .*in front$/);
    const described = front?.getAttribute("aria-describedby");
    expect(document.getElementById(described ?? "")?.textContent).toMatch(/stick it on/);
    // A sticker's own name is its number, without the instruction.
    const slot = front?.querySelector(".tray__slot");
    expect(slot?.getAttribute("aria-label")).toMatch(/^No\.\d+$/);
  });

  describe("on a board of this height", () => {
    /** Where the tray starts on the board, on the screen the test's media queries describe. */
    const trayTop = () => trayTopFor(window.matchMedia(LARGE_SCREEN).matches);
    /** The board's height: the tray's column runs from under the header to its foot. */
    let boardHeight = 0;
    /** Opens the tray on a board this tall, holding these stickers, or this many. */
    const openOn = async (height: number, stickers: number | BoardStickerView[] = 30) => {
      boardHeight = height;
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains("tray__col") ? boardHeight - trayTop() : boardHeight;
      });
      render(typeof stickers === "number" ? manyStickers(stickers) : stickers);
      await openTray();
    };
    /** The numbers an inline transform holds, such as 0 and 12.5 in translate(0px,12.5px). */
    const numbersIn = (el: Element | null) =>
      el instanceof HTMLElement
        ? (el.style.transform.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
        : [];
    /** The sheets' page height, as the tray draws them. */
    const pageH = () =>
      parseFloat(
        board.querySelector<HTMLElement>(".tray")?.style.getPropertyValue("--sheet-h") ?? "",
      );
    /** How many sheets the open stack holds: those drawn, and those behind its +N button. */
    const sheetCount = () =>
      (stackEl()?.querySelectorAll(".tray__sheet").length ?? 0) +
      Number(stackEl()?.querySelector(".tray__depth span")?.textContent?.slice(1) ?? 0);
    /**
     * The open stack's scale, where its foot (with the edges and the +N button) ends, and where the
     * open mouth ends, in the column's px.
     */
    const openStack = (height: number) => {
      const [, stackTop = NaN, scale = NaN] = numbersIn(stackEl());
      const [, mouthFootShift = NaN] = numbersIn(board.querySelector(".tray__w2"));
      const stackFoot = stackTop + scale * pageH() + stackFootFor(sheetCount());
      return { scale, stackFoot, mouthFoot: height - trayTop() + mouthFootShift };
    };

    it("packs the same sheets on a taller board, drawing them taller", async () => {
      await openOn(523, 40);
      const onShort = sheetCount();
      act(() => root.unmount());
      root = createRoot(host);
      await openOn(900, 40);
      expect(pageH()).toBeGreaterThan(SHEET.h);
      expect(sheetCount()).toBe(onShort);
    });

    it("keeps a pulled-out sheet's stickers on it as the board's height changes, as an iPad turns", async () => {
      endAnimationsAtOnce();
      const observers = stubResizeObservers();
      await openOn(776, 40);
      const onPulled = () =>
        [...(pulledSheet()?.querySelectorAll(".tray__slot") ?? [])].map((el) =>
          el.getAttribute("data-id"),
        );
      await pullOut();
      const before = onPulled();
      expect(before.length).toBeGreaterThan(0);
      boardHeight = 560;
      const col = board.querySelector(".tray__col");
      if (col) act(() => observers.resize(col));
      expect(onPulled()).toEqual(before);
    });

    it("fills the open pouch with the pages a folder tab deals, though it deals fewer", async () => {
      // Only the newest sticker is a gift: Gifts deals its one sheet.
      await openOn(
        776,
        manyStickers(60).map((s, i) => (i === 59 ? { ...s, artist: friend } : s)),
      );
      act(() => board.querySelector<HTMLElement>('.tray__tab[data-filter="gifts"]')?.click());
      expect(sheetCount()).toBe(1);
      const { stackFoot, mouthFoot } = openStack(776);
      expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
      expect(mouthFoot - stackFoot).toBeLessThan(2 * POUCH_LINING);
    });

    it("grows the stack on a large screen, and opens the mouth only a little past it", async () => {
      media(window.matchMedia("all"), true);
      await openOn(1200, 60);
      const { scale, stackFoot, mouthFoot } = openStack(1200);
      expect(scale).toBeGreaterThan(1);
      expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
      expect(mouthFoot - stackFoot).toBeLessThan(STACK_FOOT);
    });

    it("never grows the stack past its most, however tall the board", async () => {
      media(window.matchMedia("all"), true);
      await openOn(3000, 60);
      expect(openStack(3000).scale).toBe(MAX_STACK_SCALE);
    });

    it("keeps a short large screen's stack about the phone's size", async () => {
      media(window.matchMedia("all"), true);
      await openOn(666, 60);
      const { scale, stackFoot, mouthFoot } = openStack(666);
      expect(scale).toBeCloseTo(1, 0);
      expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
    });

    it("leaves the stack full size when everything fits the mouth", async () => {
      await openOn(700);
      const [, , scale] = numbersIn(stackEl());
      expect(scale).toBe(1);
    });

    // A phone's browser outside LINE gives the board more height than the stack needs.
    it.each([
      ["one sheet", 1],
      ["a deep stack", 60],
    ])("fills a tall board's open pouch with the pages of %s, full size", async (_, stickers) => {
      await openOn(776, stickers);
      const [, stackTop = NaN, scale = NaN] = numbersIn(stackEl());
      const [, mouthFootShift = NaN] = numbersIn(board.querySelector(".tray__w2"));
      const mouthFoot = 776 - trayTop() + mouthFootShift;
      const stackFoot = stackTop + scale * pageH() + stackFootFor(sheetCount());
      expect(scale).toBe(1);
      // The pages fill the open mouth, down to a little lining under the sheets.
      expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
      expect(mouthFoot - stackFoot).toBeLessThan(2 * POUCH_LINING);
    });

    it("runs the slider down to the bottom stop, however few the sheets", async () => {
      await openOn(776, 1);
      const [, sliderY = NaN] = numbersIn(board.querySelector(".zip__slider"));
      const [, stopY = NaN] = numbersIn(board.querySelector(".zip__stop--bottom"));
      // The slider's length, as its body is drawn.
      const [, , , length = NaN] = (
        board.querySelector(".zip__body")?.getAttribute("viewBox") ?? ""
      )
        .split(" ")
        .map(Number);
      expect(stopY - sliderY).toBeGreaterThan(0);
      expect(stopY - sliderY).toBeLessThan(length);
    });

    it("takes a sticker back beside the open mouth, and not from below it", async () => {
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains("tray__col") ? 776 - trayTop() : 776;
      });
      render([sticker("a", 1, true), sticker("b", 2, true)]);
      await openTray();
      const putBack = async (id: string, y: number) => {
        let back: boolean | undefined;
        await act(async () => {
          back = await tray.current?.boardDrop(id, { x: 380, y });
        });
        return back;
      };
      expect(await putBack("a", 770)).toBe(false);
      expect(await putBack("b", 300)).toBe(true);
    });

    // An iPhone SE inside LINE has the shortest board the tray is made for; the other is shorter.
    it.each([523, 501])(
      "shrinks the stack until the +N button fits the mouth, on a board %ipx tall",
      async (height) => {
        // Enough sheets for the +N button.
        await openOn(height, 60);
        expect(board.querySelector(".tray__depth")).not.toBeNull();
        const [, stackTop, shrink] = numbersIn(stackEl());
        const [, mouthFootShift] = numbersIn(board.querySelector(".tray__w2"));
        const mouthFoot = height - trayTop() + mouthFootShift;
        expect(shrink).toBeLessThan(1);
        expect(stackTop + shrink * pageH() + STACK_FOOT).toBeLessThanOrEqual(mouthFoot);
      },
    );

    it.each([480, 700])("spreads every sheet inside the board", async (height) => {
      // Enough sheets for the +N button and two rows in the spread.
      await openOn(height, 60);
      act(() => board.querySelector<HTMLElement>(".tray__depth")?.click());
      const cells = [...board.querySelectorAll<HTMLElement>(".tray__cell")];
      expect(cells.length).toBeGreaterThan(3);
      for (const cell of cells) {
        const [, y, turn, k] =
          /translate\([\d.-]+px,([\d.-]+)px\) rotate\(([\d.-]+)deg\) scale\(([\d.]+)\)/
            .exec(cell.style.transform)
            ?.map(Number) ?? [NaN];
        expect(turn).toBeDefined();
        // Below the header and above the board's foot.
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y + pageH() * k).toBeLessThanOrEqual(height);
      }
    });
  });

  it("leaves a shut tray inert, and reaches it again once it's open", async () => {
    render(manyStickers(8));
    const window1 = () => board.querySelector(".tray__w1");
    expect(window1()?.hasAttribute("inert")).toBe(true);
    await openTray();
    expect(window1()?.hasAttribute("inert")).toBe(false);
    await act(async () => void (await tray.current?.close()));
    expect(window1()?.hasAttribute("inert")).toBe(true);
  });

  it("picks a folder tab as a pressed button that filters the sheets", async () => {
    render(stickersWithGifts(30));
    await openTray();
    expect(board.querySelector(".tray__tabs")?.getAttribute("role")).toBe("group");
    const tab = (filter: string) =>
      board.querySelector<HTMLElement>(`.tray__tab[data-filter="${filter}"]`);
    expect(tab("all")?.getAttribute("aria-pressed")).toBe("true");
    act(() => tab("gifts")?.click());
    expect(tab("gifts")?.getAttribute("aria-pressed")).toBe("true");
    expect(tab("all")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("renames its Zipper and folder tabs when the app's language changes, keeping what it has shown", async () => {
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    // Arrived today, so each is NEW until a tray has shown it.
    render(stickersWithGifts(6).map((s) => ({ ...s, arrivedAt: Date.now() })));
    await openAndShut();
    await act(() => i18next.changeLanguage("ja"));
    expect(board.querySelectorAll(".tray")).toHaveLength(1);
    expect(board.querySelector(".zip__slider")?.getAttribute("aria-label")).toBe(
      stickerBoard.tray.zipper.ja,
    );
    expect(board.querySelector('.tray__tab[data-filter="gifts"]')?.textContent).toBe(
      stickerBoard.tray.filters.gifts.ja,
    );
  });

  it("marks a sticker that just landed on the board as new on its hole, until the tray shows it", async () => {
    render([sticker("fresh", Date.now(), true)]);
    expect(dotOf("fresh")?.className).toBe("tray__new");
    expect(slotOf("fresh")?.getAttribute("aria-label")).toMatch(/, new, on your board\. Show it$/);

    await openAndShut();
    expect(dotOf("fresh")).toBeNull();
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

  it("reports what the open tray showed as seen when a new language rebuilds it open, as shutting does", async () => {
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    const onSeen = vi.fn();
    render([sticker("new", Date.now(), false)], {}, onSeen);
    await openTray();
    expect(onSeen).not.toHaveBeenCalled();
    await act(() => i18next.changeLanguage("ja"));
    expect(onSeen).toHaveBeenCalledExactlyOnceWith(["new"]);
    // The rebuilt tray shows it as seen, and has nothing more to report.
    expect(dotOf("new")).toBeNull();
    await openAndShut();
    expect(onSeen).toHaveBeenCalledTimes(1);
  });
});
