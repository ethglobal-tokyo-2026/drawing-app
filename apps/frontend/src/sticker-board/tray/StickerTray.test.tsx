// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { MeContext } from "../../api/meContext";
import { TEST_ME } from "../../api/testing";
import { forgetBoardComplete, markBoardComplete, QUIET_MS } from "../boardComplete";
import { strings } from "../../i18n/strings";
import { errors } from "../../i18n/strings/errors";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import type { BoardStickerView } from "../boardSticker";
import { StickerTray, type StickerTrayHandle } from "./StickerTray";
import { TUG_VISITS, type TrayBoard } from "./trayEngine";
import { SHEET, STACK_FOOT, TOP } from "./trayModel";
import { NUDGE_AFTER } from "./trayNudge";
import type { TrayProblem } from "./trayProblem";
import { countVisit } from "./traySeen";

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
  nsfw: false,
  width: 100,
  height: 80,
  // A stored cut line, so its shape is known without reading an image.
  outline: "M10.0 10.0L90.0 10.0L90.0 70.0L10.0 70.0Z",
  urls: testStickerUrls(id),
  placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
  artist: { id: "me", handle: "you", name: "You", nsfwOptIn: true },
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
const trayOf = (
  stickers: BoardStickerView[],
  side: Partial<TrayBoard> = {},
  onSeen: (ids: readonly string[]) => void = () => {},
  onProblem: (problem: TrayProblem) => void = () => {},
) => (
  <StickerTray
    ref={tray}
    board={board}
    stickers={stickers}
    ownerId="me"
    api={{ ...api, ...side }}
    onSeen={onSeen}
    onProblem={onProblem}
  />
);
const render = (...given: Parameters<typeof trayOf>) => act(() => root.render(trayOf(...given)));
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
/**
 * Reduced motion until `animate` turns it off (or back on), and animations that end only when
 * `finishAll` ends them, so a page turn can be caught partway. `asked` keeps every animation with the
 * element and keyframes it was asked for.
 */
const holdAnimations = () => {
  let reduce = true;
  const motion = window.matchMedia("all");
  Object.defineProperty(motion, "matches", { get: () => reduce });
  vi.spyOn(window, "matchMedia").mockReturnValue(motion);
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
const friend = { id: "friend", handle: "friend", name: "Friend", nsfwOptIn: true };
const bob = { id: "bob", handle: "bob", name: "Bob", nsfwOptIn: true };
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
  vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
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

  it("leaves a given sticker's spot, a button that opens it among the stickers you gave", async () => {
    const openGiven = vi.fn();
    render([givenSticker("given", 1), sentSticker("sent", 3)], { openGiven });
    await act(async () => void (await tray.current?.open()));
    const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="given"]');
    expect(spot?.getAttribute("aria-label")).toBe("No.0001, given to @bob. Open it");
    // Nothing of the sticker shows, and it takes the shared press.
    expect(spot?.querySelector(".tray__fit, .tray__img")).toBeNull();
    expect(spot?.getAttribute("data-press")).toBe("");
    // A sticker on its way leaves nothing to tap: the pending gifts badge holds it.
    expect(slotOf("sent")).toBeNull();

    act(() => spot?.click());
    expect(openGiven).toHaveBeenCalledExactlyOnceWith("given");
  });

  it("traces a given sticker's own cut line on its spot, and leaves one on its way only paper", async () => {
    render([givenSticker("given", 1), sentSticker("sent", 3)]);
    await openTray();
    const outlines = board.querySelectorAll(".tray__given-outline");
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
      expect(problems.map((p) => [p.kind, p.nos, Boolean(p.reason)])).toEqual([
        ["place", [1], true],
      ]);
      expect(stateOf(id ?? "")).toBe("here");
    });

    it("when placing a sticker fails, in the app's words with the error's own for a report", async () => {
      const place = () => Promise.reject(new Error("the connection is asleep"));
      render(manyStickers(8), { place }, undefined, (p) => problems.push(p));
      await stickOnFirst();
      expect(problems).toEqual([
        {
          kind: "place",
          nos: [1],
          reason: errors.unexpected.en,
          detail: "Error: the connection is asleep",
        },
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

  it.each([
    { nsfwOptIn: false, blurred: true },
    { nsfwOptIn: true, blurred: false },
  ])(
    "marks an 18+ sticker on its sheet 18+, and says so, only while it's blurred for you ($nsfwOptIn)",
    async ({ nsfwOptIn, blurred }) => {
      const me: Me = { ...TEST_ME, nsfwOptIn };
      const stickers = [sticker("nsfw", 1, false, { nsfw: true }), sticker("plain", 2, false)];
      act(() => root.render(<MeContext value={me}>{trayOf(stickers)}</MeContext>));
      await openTray();
      const marked = (id: string) => slotOf(id)?.querySelector(".nsfw-mark") != null;
      const label = (id: string) => slotOf(id)?.getAttribute("aria-label");
      expect(marked("nsfw")).toBe(blurred);
      expect(marked("plain")).toBe(false);
      // Both are No.0001: one blurred is named as the other, then said to be blurred.
      expect(label("nsfw")).toBe(
        blurred ? `${label("plain")}, ${strings.stickers.nsfw.veiled.en}` : label("plain"),
      );
    },
  );

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
    /** Opens the tray on a board this tall, its column running from under the header to the foot. */
    const openOn = async (height: number, stickers = 30) => {
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains("tray__col") ? height - TOP : height;
      });
      render(manyStickers(stickers));
      await openTray();
    };
    /** The numbers an inline transform holds, such as 0 and 12.5 in translate(0px,12.5px). */
    const numbersIn = (el: Element | null) =>
      el instanceof HTMLElement
        ? (el.style.transform.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
        : [];

    it("leaves the stack full size when everything fits the mouth", async () => {
      await openOn(700);
      const [, , scale] = numbersIn(stackEl());
      expect(scale).toBe(1);
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
        const mouthFoot = height - TOP + mouthFootShift;
        expect(shrink).toBeLessThan(1);
        expect(stackTop + shrink * SHEET.h + STACK_FOOT).toBeLessThanOrEqual(mouthFoot);
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
        expect(y + 364 * k).toBeLessThanOrEqual(height);
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

  it("marks a sticker that just landed on the board as new, on its hole and on the pull, until the tray shows it", async () => {
    render([sticker("fresh", Date.now(), true)]);
    const pull = board.querySelector(".zip__slider");
    const pip = board.querySelector<HTMLElement>(".zip__pip");
    const hole = () => board.querySelector(".tray__slot");
    expect(pip?.hidden).toBe(false);
    expect(pull?.getAttribute("aria-label")).toBe("Your stickers, something new inside");
    expect(hole()?.querySelector(".tray__new")).not.toBeNull();
    expect(hole()?.getAttribute("aria-label")).toMatch(/, new, on your board\. Show it$/);

    await openAndShut();
    expect(pip?.hidden).toBe(true);
    expect(pull?.getAttribute("aria-label")).toBe("Your stickers");
    expect(hole()?.querySelector(".tray__new")).toBeNull();
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
