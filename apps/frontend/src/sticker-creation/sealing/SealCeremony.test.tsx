// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi, shownText } from "../../api/testing";
import { MARKUP_LIKE_NAME, sticker as apiSticker } from "../../api/testFixtures";
import type { Sticker } from "@drawing-app/api/client";
import { formatDay, formatDuration, formatNo } from "../../stickers/format";
import { formatRefillTime } from "../../tickets/refill";
import { nextRefill } from "../../tickets/tickets";
import type { SealedSticker } from "./makeSticker";
import { SealCeremony } from "./SealCeremony";
import { TOTAL } from "./sealTimeline";

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

let view: ReturnType<typeof renderWithApi> | undefined;
let host: HTMLDivElement;

// One sheet for every render: a new one would be a new ceremony.
const SHEET = { x: 8, y: 8, w: 374, h: 788 };

/** The ceremony with the server's answer, as `handle`: null while the seal is on its way. */
const ceremony = (answer: Sticker | null, { handle = "alice", failed = false } = {}) => (
  <SealCeremony
    sticker={sticker}
    sealed={answer}
    failed={failed}
    sheet={SHEET}
    handle={handle}
    onKeepDrawing={onKeepDrawing}
    onBoard={onBoard}
    onShop={onShop}
  />
);

/**
 * Opens the ceremony as `handle`, with `used` of the day's three tickets used, then `reserve.used`
 * reserve tickets, and `reserve.left` still held.
 */
async function seal(
  used: number,
  handle = "alice",
  answer: Sticker | null = sealed,
  reserve = { used: 0, left: 0 },
) {
  const usedToday = Array.from({ length: used + reserve.used }, (_, i) => ({
    id: i + 1,
    dayIndex: i,
    kind: i < used ? ("daily" as const) : ("reserve" as const),
    sticker: null,
  }));
  const tickets = { ...FRESH_TICKETS, dailyLeft: 3 - used, reserveLeft: reserve.left, usedToday };
  view = renderWithApi(
    ceremony(answer, { handle }),
    emptyApi({ tickets: () => Promise.resolve(tickets) }),
  );
  host = view.host;
  // The tickets load before the card can show them.
  await act(async () => {});
}

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
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
/** Past the ceremony's end: its clock starts at its first animation frame, not at mount. */
const playThrough = () => wait(TOTAL + 50);

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
    ["Keep drawing", onKeepDrawing],
    ["Go to sticker board", onBoard],
  ])("acts on %s once, and only once the ceremony has played", async (name, action) => {
    await seal(1);
    wait(1000);
    act(() => button(name).click());
    wait(1000);
    expect(action).not.toHaveBeenCalled();
    playThrough();
    act(() => button(name).click());
    act(() => button(name).click());
    wait(1000);
    expect(action).toHaveBeenCalledOnce();
  });

  it("leads to the sticker board and the ticket shop on the last ticket", async () => {
    await seal(1);
    playThrough();
    expect(button("Keep drawing")).toBeTruthy();
    expect(button("Go to sticker board").classList.contains("label-btn")).toBe(true);
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "2 daily tickets left today",
    );
    view?.unmount();

    await seal(3);
    playThrough();
    expect(button("Go to sticker board").classList.contains("key")).toBe(true);
    act(() => button("Shop for tickets").click());
    wait(1000);
    expect(onShop).toHaveBeenCalledOnce();
    expect(host.textContent).toContain(
      `That was today’s last ticket · new ones at ${formatRefillTime(nextRefill(NOW))}`,
    );
  });

  it("says the day's last daily ticket is gone only when this sticker used it", async () => {
    const lastDaily = `That was today’s last daily ticket · new ones at ${formatRefillTime(nextRefill(NOW))}`;
    await seal(3, "alice", sealed, { used: 0, left: 2 });
    playThrough();
    expect(host.textContent).toContain(lastDaily);
    view?.unmount();

    // A reserve ticket sealed this one: the daily tickets were already gone.
    await seal(3, "alice", sealed, { used: 1, left: 1 });
    playThrough();
    expect(button("Keep drawing")).toBeTruthy();
    expect(host.textContent).not.toContain("last daily ticket");
  });

  it("waits at the cut while the seal is on its way, then peels onto the card", async () => {
    await seal(1, "alice", null);
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
    await seal(1, "alice", null);
    wait(100);
    tap();
    expect(host.querySelector<HTMLElement>(".seal-ceremony__plain")?.style.opacity).toBe("1");
    view?.rerender(ceremony(sealed));
    wait(100);
    tap();
    expect(card()?.hasAttribute("inert")).toBe(false);
  });

  it("fades back to the drawing when the seal fails", async () => {
    await seal(1, "alice", null);
    wait(3000);
    view?.rerender(ceremony(null, { failed: true }));
    expect(root()?.classList.contains("is-leaving")).toBe(true);
    expect(root()?.hasAttribute("data-lifted")).toBe(false);
    expect(card()).toBeNull();
  });

  it("prints a handle that reads as markup as it is, in the card's fine print", async () => {
    await seal(1, MARKUP_LIKE_NAME);
    expect(shownText(".sealed-card__fine")).toBe(
      `${formatNo(sealed.number)} · ${formatDuration(sealed.timeUsed)} · ${formatDay(NOW.getTime())} · @${MARKUP_LIKE_NAME}`,
    );
  });
});
