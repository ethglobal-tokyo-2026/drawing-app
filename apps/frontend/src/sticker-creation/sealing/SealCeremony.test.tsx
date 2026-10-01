// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi, shownText } from "../../api/testing";
import { MARKUP_LIKE_NAME, sticker as apiSticker } from "../../api/testFixtures";
import type { Sticker, Tickets } from "@drawing-app/api/client";
import { formatDay, formatDuration, formatNo } from "../../stickers/format";
import { formatRefillTime } from "../../tickets/refill";
import { useTickets } from "../../tickets/useTickets";
import { ReducedMotion } from "../../ui/testing";
import type { SealedSticker } from "./makeSticker";
import { SealCeremony } from "./SealCeremony";
import { lineShownAt, T, TOTAL } from "./sealTimeline";

const NOW = new Date(2026, 8, 26, 21, 4);

const sticker: SealedSticker = {
  png: new Blob(),
  mask: new Blob(),
  spec: new Blob(),
  rim: new Blob(),
  flat: new Blob(),
  outline: "M0 0L100 0L100 80Z",
  width: 120,
  height: 100,
  pad: 6,
  inkWidth: 748,
  place: { x: 100, y: 200, w: 480, h: 400 },
  contour: [
    [130, 230],
    [550, 230],
    [550, 570],
    [130, 570],
  ],
  layers: {
    plain: "blob:plain",
    tint: "blob:tint",
    gloss: "blob:gloss",
    shadow: "blob:shadow",
    mask: "blob:mask",
    spec: "blob:spec",
    rim: "blob:rim",
  },
  maskImage: document.createElement("canvas"),
  dispose: () => {},
};

const sealed = apiSticker({ number: 147, timeUsed: 292, sealedAt: NOW.toISOString() });

const onKeepDrawing = vi.fn();
const onBoard = vi.fn();
const onShop = vi.fn();
const onLeft = vi.fn();

let view: ReturnType<typeof renderWithApi> | undefined;
let host: HTMLDivElement;
/** When `seal` mounted the ceremony, on the test's clock. */
let mountedAt = 0;

// One sheet for every render: a new one would be a new ceremony.
const SHEET = { x: 8, y: 8, w: 374, h: 788 };

/** The ceremony with the server's answer, as `handle`: null while the seal is on its way. */
const ceremony = (
  answer: Sticker | null,
  { handle = "alice", failed = false, leaving = false } = {},
) => (
  <SealCeremony
    sticker={sticker}
    sealed={answer}
    failed={failed}
    leaving={leaving}
    onLeft={onLeft}
    sheet={SHEET}
    handle={handle}
    onKeepDrawing={onKeepDrawing}
    onBoard={onBoard}
    onShop={onShop}
  />
);

/** The day's `dayIndex`th ticket use, of `kind`. */
const use = (dayIndex: number, kind: "daily" | "reserve" = "daily") => ({
  id: dayIndex + 1,
  dayIndex,
  kind,
  sticker: null,
});

/**
 * Opens the ceremony as `handle`, with `used` of the day's three tickets used, then `reserveUsed` reserve tickets,
 * and `reserveLeft` held. `answer` is the server's: null while the seal is on its way.
 */
async function seal(
  used: number,
  handle = "alice",
  {
    answer = sealed,
    reserveLeft = 0,
    reserveUsed = 0,
  }: { answer?: Sticker | null; reserveLeft?: number; reserveUsed?: number } = {},
) {
  const usedToday = Array.from({ length: used + reserveUsed }, (_, i) =>
    use(i, i < used ? "daily" : "reserve"),
  );
  const tickets = { ...FRESH_TICKETS, dailyLeft: 3 - used, reserveLeft, usedToday };
  view = renderWithApi(
    ceremony(answer, { handle }),
    emptyApi({ tickets: () => Promise.resolve(tickets) }),
  );
  host = view.host;
  mountedAt = Date.now();
  // The tickets load before the card can show them.
  await act(async () => {});
}

/** The ceremony, and a way to change the tickets behind its back, as a spend or a refresh does. */
function WithTickets({ leaving = false }: { leaving?: boolean }) {
  const { refresh } = useTickets();
  return (
    <>
      {ceremony(sealed, { leaving })}
      <button type="button" data-set-tickets onClick={refresh} />
    </>
  );
}

/** Opens WithTickets once `loaded` has loaded; the tickets change to `next` when they load again. */
async function sealWithTickets(loaded: Tickets, next: Tickets) {
  const load = vi.fn(() => Promise.resolve(next)).mockResolvedValueOnce(loaded);
  view = renderWithApi(<WithTickets />, emptyApi({ tickets: load }));
  host = view.host;
  await act(async () => {});
}
const setTickets = () =>
  act(async () => host.querySelector<HTMLButtonElement>("[data-set-tickets]")?.click());

const button = (name: string) => {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === name);
  if (!found) throw new Error(`no "${name}" button`);
  return found;
};
const card = () => host.querySelector(".sealed-card");
const root = () => host.querySelector(".seal-ceremony");
const tap = () =>
  act(() => {
    root()?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
/** A finger's tap on `el`: the press, which the ceremony would take as a skip, then the click. */
const tapOn = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    el.click();
  });
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
/** More than a frame: the ceremony's clock starts at its first animation frame, not at mount. */
const FRAME_SLACK_MS = 50;
const playThrough = () => wait(TOTAL + FRAME_SLACK_MS);
const lines = () => [...host.querySelectorAll<HTMLElement>("[data-card-line]")];
/** Which of the card's lines, in the order they fade up, holds `el`. */
const lineOf = (el: Element) => lines().findIndex((line) => line.contains(el));
/** Moves the clock on to `ms` after `seal` mounted the ceremony. */
const until = (ms: number) => wait(mountedAt + ms - Date.now());
/** Just before, or just past, when `el`'s line has faded all the way up. */
const beforeShown = (el: Element) => until(lineShownAt(lineOf(el)) - FRAME_SLACK_MS);
const toShown = (el: Element) => until(lineShownAt(lineOf(el)) + FRAME_SLACK_MS);
const stillFading = () => Number(lines().at(-1)?.style.opacity) < 1;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  // Whether the sheen plays isn't tested here; happy-dom's own animations reject unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  // happy-dom has no 2D canvas: the ceremony plays without its dim, used sticker silhouette and
  // cut line, and says so.
  const report = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...rest: unknown[]) => {
    if (!String(message).startsWith("No 2D context")) report(message, ...rest);
  });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("SealCeremony", () => {
  it.each<[string, () => void]>([
    [
      "a tap",
      () =>
        host.firstElementChild?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
    ],
    [
      "Enter",
      () =>
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    ],
  ])("skips to the sealed card at %s", async (_, skip) => {
    await seal(1);
    wait(400);
    expect(card()?.hasAttribute("inert")).toBe(true);
    act(skip);
    expect(card()?.hasAttribute("inert")).toBe(false);
    expect(host.querySelector<HTMLElement>(".seal-ceremony__sticker")?.style.transform).toContain(
      "rotate(-2deg)",
    );
  });

  it.each([
    ["Keep drawing", 1, onKeepDrawing],
    ["Back to My board", 3, onBoard],
  ])(
    "takes %s once its line has faded up, before the ceremony ends, and only once",
    async (name, used, action) => {
      await seal(used);
      const key = button(name);
      beforeShown(key);
      act(() => key.click());
      wait(1000);
      expect(action).not.toHaveBeenCalled();
      view?.unmount();

      await seal(used);
      const shown = button(name);
      toShown(shown);
      // Focus is on it from then, for keyboards and screen readers.
      expect(document.activeElement).toBe(shown);
      tapOn(shown);
      tapOn(shown);
      // The tap was the key's own: the lines under it go on fading up.
      expect(stillFading()).toBe(true);
      wait(1000);
      expect(action).toHaveBeenCalledOnce();
    },
  );

  it("keeps a key under the first from presses until its own line has faded up", async () => {
    await seal(1);
    const board = button("Back to My board");
    toShown(button("Keep drawing"));
    act(() => board.click());
    wait(1000);
    expect(onBoard).not.toHaveBeenCalled();
    act(() => board.click());
    wait(1000);
    expect(onBoard).toHaveBeenCalledOnce();
  });

  it("takes Escape to the board from when its first key has faded up", async () => {
    await seal(1);
    toShown(button("Keep drawing"));
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    wait(1000);
    expect(onBoard).toHaveBeenCalledOnce();
  });

  it("keeps drawing at once, since the card's exit carries the change, but lets the press show before the board", async () => {
    await seal(1);
    playThrough();
    act(() => button("Keep drawing").click());
    expect(onKeepDrawing).toHaveBeenCalledOnce();
    view?.unmount();

    await seal(1);
    playThrough();
    act(() => button("Back to My board").click());
    expect(onBoard).not.toHaveBeenCalled();
    wait(200);
    expect(onBoard).toHaveBeenCalledOnce();
  });

  it("carries the card away over the fresh sheet, then lets it go", async () => {
    await seal(1);
    // Kept drawing as soon as it could: the rest of the ceremony plays out on the way.
    toShown(button("Keep drawing"));
    view?.rerender(ceremony(sealed, { leaving: true }));
    expect(root()?.classList.contains("is-leaving")).toBe(true);
    expect(host.querySelector(".ticket-stub.is-peeling")).not.toBeNull();
    playThrough();
    expect(stillFading()).toBe(false);
    // It takes no more presses on its way out, and no taps meant for the sheet under it.
    expect(card()?.hasAttribute("inert")).toBe(true);
    const carrier = host.querySelector(".seal-ceremony__carrier");
    // The fade over the carry's last half ends too, but only the carry's end lets it go.
    act(() => {
      carrier?.dispatchEvent(
        new AnimationEvent("animationend", { animationName: "seal-ceremony-fade", bubbles: true }),
      );
    });
    expect(onLeft).not.toHaveBeenCalled();
    act(() => {
      carrier?.dispatchEvent(
        new AnimationEvent("animationend", { animationName: "seal-ceremony-carry", bubbles: true }),
      );
    });
    expect(onLeft).toHaveBeenCalledOnce();
  });

  it("leaves as it was, whatever the spend it hands over to does to the tickets meanwhile", async () => {
    const oneLeft: Tickets = { ...FRESH_TICKETS, dailyLeft: 1 };
    const spent: Tickets = { ...oneLeft, dailyLeft: 0 };
    await sealWithTickets(oneLeft, spent);
    playThrough();
    view?.rerender(<WithTickets leaving />);
    // Keep drawing spends the last ticket as the card leaves: it doesn't turn into the last ticket's card.
    await setTickets();
    expect(button("Keep drawing")).toBeTruthy();
    expect(host.textContent).not.toContain("New daily tickets at");
  });

  it("fades a line the card changes to mid-ceremony up in its turn", async () => {
    // This sticker used the last ticket of all; the refresh after the seal brings a new day's tickets.
    const lastOfAll: Tickets = {
      ...FRESH_TICKETS,
      dailyLeft: 0,
      usedToday: [use(0), use(1), use(2)],
    };
    await sealWithTickets(lastOfAll, FRESH_TICKETS);
    wait(T.card0);
    expect(button("Buy reserve tickets")).toBeTruthy();
    await setTickets();
    wait(50);
    // The shop's line gives way to the board's, which waits below the lines still to fade up.
    const board = button("Back to My board");
    expect(board.style.opacity).toBe("0");
    playThrough();
    expect(board.style.opacity).toBe("1");
  });

  it("ends the day on when new daily tickets come, with reserve tickets quiet under it", async () => {
    await seal(1);
    playThrough();
    expect(button("Keep drawing")).toBeTruthy();
    expect(button("Back to My board").classList.contains("label-btn")).toBe(true);
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "2 daily tickets left",
    );
    view?.unmount();

    await seal(3);
    playThrough();
    expect(button("Back to My board").classList.contains("key")).toBe(true);
    expect(host.querySelector(".sealed-card__refill")?.textContent).toBe(
      `New daily tickets at ${formatRefillTime(new Date(FRESH_TICKETS.nextRefillAt))}`,
    );
    // Small label stock, not a second full-width button.
    expect(button("Buy reserve tickets").classList.contains("label-btn--sm")).toBe(true);
    act(() => button("Buy reserve tickets").click());
    wait(1000);
    expect(onShop).toHaveBeenCalledOnce();
  });

  it("says when daily tickets come back only when this sticker used the day's last one", async () => {
    const refill = `New daily tickets at ${formatRefillTime(new Date(FRESH_TICKETS.nextRefillAt))}`;
    await seal(3, "alice", { reserveLeft: 2 });
    playThrough();
    expect(host.textContent).toContain(refill);
    // One reserve ticket in the daily slots' place, with its count.
    expect(host.querySelectorAll(".ticket-stub")).toHaveLength(1);
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "2 reserve tickets left",
    );
    view?.unmount();

    // A reserve ticket sealed this one: the daily tickets were already gone.
    await seal(3, "alice", { reserveLeft: 1, reserveUsed: 1 });
    playThrough();
    expect(button("Keep drawing")).toBeTruthy();
    expect(host.textContent).not.toContain("New daily tickets at");
  });

  it("waits at the cut while the seal is on its way, then peels onto the card", async () => {
    await seal(1, "alice", { answer: null });
    wait(20_000);
    expect(card()).toBeNull();
    expect(root()?.hasAttribute("data-lifted")).toBe(false);
    // A tap can't hurry the server.
    tap();
    expect(card()).toBeNull();

    view?.rerender(ceremony(sealed));
    wait(1000);
    expect(root()?.hasAttribute("data-lifted")).toBe(true);
    expect(card()?.hasAttribute("inert")).toBe(true);
    playThrough();
    expect(card()?.hasAttribute("inert")).toBe(false);
  });

  it("skips to the wait at a tap, and on to the card once sealed", async () => {
    await seal(1, "alice", { answer: null });
    wait(100);
    tap();
    expect(host.querySelector<HTMLElement>(".seal-ceremony__plain")?.style.opacity).toBe("1");
    view?.rerender(ceremony(sealed));
    wait(100);
    tap();
    expect(card()?.hasAttribute("inert")).toBe(false);
  });

  it("stays where it is when reduced motion is switched off, rather than starting over", async () => {
    const setting = new ReducedMotion(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(setting);
    await seal(1);
    wait(100);
    // Reduced motion starts at the card.
    expect(card()?.hasAttribute("inert")).toBe(false);
    act(() => setting.change(false));
    wait(100);
    expect(host.querySelector<HTMLElement>(".sealed-card")?.style.opacity).toBe("1");
    expect(host.querySelector<HTMLElement>(".seal-ceremony__sticker")?.style.transform).toContain(
      "rotate(-2deg)",
    );
  });

  it("frees its canvases' memory as it closes", async () => {
    // As big as a phone's screen, so every canvas has pixels to free.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(SHEET.w);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(SHEET.h);
    await seal(1);
    const canvases = [...host.querySelectorAll("canvas")];
    const areas = () => canvases.map((c) => c.width * c.height);
    expect(canvases.length).toBeGreaterThan(0);
    expect(areas()).not.toContain(0);
    view?.unmount();
    view = undefined;
    expect(areas()).toEqual(canvases.map(() => 0));
  });

  it("fades back to the drawing when the seal fails", async () => {
    await seal(1, "alice", { answer: null });
    wait(3000);
    view?.rerender(ceremony(null, { failed: true }));
    expect(root()?.classList.contains("is-failed")).toBe(true);
    expect(root()?.hasAttribute("data-lifted")).toBe(false);
    expect(card()).toBeNull();
  });

  it("prints a handle that reads as markup as it is, in the card's fine print", async () => {
    await seal(1, MARKUP_LIKE_NAME);
    expect(shownText(".sealed-card__fine")).toBe(
      `${formatNo(sealed.number)} · ${formatDuration(sealed.timeUsed)} · ${formatDay(NOW.getTime())} · @${MARKUP_LIKE_NAME}`,
    );
    // The handle keeps its own case in the fine print's capitals.
    expect(host.querySelector(".sealed-card__fine .handle")?.textContent).toBe(
      `@${MARKUP_LIKE_NAME}`,
    );
  });
});
