// @vitest-environment happy-dom
import type {
  BoardSticker as ApiBoardSticker,
  StickerBoard as LoadedBoard,
  Person,
} from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardSticker, gift, people, sticker, trailEntry } from "../api/testFixtures";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { toApiPlacement, toPerson } from "../api/views";
import { forgetNoticedHere, markNoticed, noticeReceivesFromNow } from "../giving/noticedGifts";
import { i18next, withBreakHints } from "../i18n/i18n";
import { api as apiStrings } from "../i18n/strings/api";
import { errors } from "../i18n/strings/errors";
import { stickerBoard } from "../i18n/strings/stickerBoard";
import { forgetGreetings } from "./artistChipGreeting";
import { forgetBoardComplete } from "./boardComplete";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { forgetSelectionHints } from "./selectionHint";
import { forget, keepBoard, keptBoardFor, readKeptBoardAgain } from "./lastBoard";
import { StickerBoard } from "./StickerBoard";
import { myStickerBoardChanged } from "./useMyStickerBoard";
import { STEP_SAVE_IDLE_MS } from "./useBoardGestures";

// The board's chat menu and Privy reach LINE's SDK; nothing here needs it to answer.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
// The stat board mounts once the board is idle; its developer slip's LINE details read LIFF's context.
vi.mock("../line/LineDetails", () => ({ LineDetails: () => null }));
// Giving itself isn't tested here: it closes as sent at a tap, from a board that can give.
vi.mock("../giving/useGiftSender", () => ({ useGiftSender: () => ({}) }));
vi.mock("../giving/Giving", () => ({
  Giving: ({ onClose }: { onClose: (sent: boolean) => void }) => (
    <button type="button" className="test-gift-sent" onClick={() => onClose(true)}>
      Sent
    </button>
  ),
}));
vi.mock("../line/liff", () => ({
  LIFF_ID: "test-liff",
  liffMockActive: true,
  useLine: () => ({
    status: "ready",
    profile: { userId: "U1", displayName: "You" },
    inClient: true,
  }),
}));

let unmount = () => {};
afterEach(async () => {
  // The board loads its sheets, detail and stat board in the background; they land before it goes.
  await act(() => vi.dynamicImportSettled());
  unmount();
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
  forgetNoticedHere();
  readKeptBoardAgain();
  forgetBoardComplete();
  forgetGreetings();
  forgetSelectionHints();
});

const at = (x: number) => ({ onBoard: true, x, y: 0.5, scale: 0.3, rotation: 0, z: 1 });
const shownIds = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>(".placed-sticker")].map((el) => el.dataset.stickerId);
const keep = (userId: string, ...stickers: ApiBoardSticker[]) =>
  keepBoard(userId, {
    owner: toPerson(TEST_OWNER),
    stickers: placeUnplaced(stickers.map(toBoardSticker)).stickers,
  });
/** happy-dom lays nothing out: the board is given a phone's size, so each arrow key moves a sticker. */
const onAPhone = () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(657);
};
/** Selects the sticker from the keyboard, and returns its key presses. */
function selectByKeys(host: HTMLElement, stickerId: string) {
  const el = host.querySelector<HTMLElement>(`[data-sticker-id="${stickerId}"]`);
  const press = (key: string) =>
    act(() => {
      el?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    });
  act(() => el?.focus());
  press("Enter");
  return press;
}

describe("StickerBoard with the board kept on this phone", () => {
  it("draws the last board at once, with no loading shapes, then swaps in the fresh board", async () => {
    const a = boardSticker({ placement: at(0.3) });
    const b = boardSticker({ placement: at(0.7) });
    keep(TEST_ME.id, a);
    let answer: (board: LoadedBoard) => void = () => {};
    const api = emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    expect(view.host.querySelectorAll(".board-loading-sticker")).toHaveLength(0);
    expect(shownIds(view.host)).toEqual([a.stickerId]);

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [a, b] }));
    expect(new Set(shownIds(view.host))).toEqual(new Set([a.stickerId, b.stickerId]));
    // The fresh board is kept for the next open.
    expect(keptBoardFor(TEST_ME.id)?.stickers.map((s) => s.id)).toEqual([a.stickerId, b.stickerId]);
  });

  it("takes the fresh board's spots over the kept ones", async () => {
    const a = boardSticker({ placement: at(0.3) });
    keep(TEST_ME.id, a);
    const moved = { ...a, placement: at(0.6) };
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [moved] }),
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    expect(keptBoardFor(TEST_ME.id)?.stickers[0].placement.x).toBe(0.6);
  });

  it("never draws a board kept for someone else, and forgets it", () => {
    keep("someone-else", boardSticker({ placement: at(0.3) }));
    const api = emptyApi({ stickerBoard: () => new Promise(() => {}) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
    expect(localStorage.getItem("draw.lastBoard")).toBeNull();
  });
});

describe("StickerBoard's check for gratitude to send", () => {
  it("says so when the check for the sticker that just arrived fails, and Try again asks again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const a = boardSticker({ placement: at(0.3) });
    const stickerDetail = vi
      .fn<ApiClient["stickerDetail"]>()
      .mockRejectedValueOnce(
        new ApiError(503, { error: "unavailable", detail: "database is busy" }),
      )
      .mockRejectedValue(new ApiError(404, { error: "sticker_not_found", detail: "gone" }));
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [a] }),
      stickerDetail,
    });
    const view = renderWithApi(
      <StickerBoard freshId={a.stickerId} onDraw={() => {}} onOpenGift={() => {}} />,
      api,
    );
    unmount = view.unmount;
    await act(async () => {});
    const alert = () => view.host.querySelector(".board-alerts")?.textContent;
    expect(alert()).toContain("Couldn’t check whether gratitude is waiting");
    expect(alert()).toContain("database is busy");

    const again = view.host.querySelector<HTMLElement>(".board-alerts .label-btn--quiet");
    await act(async () => again?.click());
    expect(stickerDetail).toHaveBeenCalledTimes(2);
    expect(alert()).toContain("gone");
  });
});

describe("StickerBoard's tickets", () => {
  it("says so over Draw when they didn't load, and Try again loads them again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tickets = vi
      .fn<ApiClient["tickets"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network", detail: "Failed to fetch" }))
      .mockResolvedValue(FRESH_TICKETS);
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [] }),
      tickets,
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    const alert = () => view.host.querySelector('.board-alerts [role="alert"]')?.textContent;
    expect(alert()).toContain("Couldn’t load your tickets");
    expect(view.host.textContent).toContain("Failed to fetch");

    const again = view.host.querySelector<HTMLElement>(".board-alerts .label-btn--quiet");
    await act(async () => again?.click());
    expect(tickets).toHaveBeenCalledTimes(2);
    expect(alert()).toBeUndefined();
  });
});

describe("StickerBoard's artist chips", () => {
  /** Whose artist chips are on the board, by their handles. */
  const chipped = (host: HTMLElement) =>
    [...host.querySelectorAll(".artist-chip-layer__chip .artist-chip__name")]
      .map((name) => name.textContent)
      .toSorted();
  const openBoard = (
    freshId?: string,
    api = emptyApi({ stickerBoard: () => new Promise(() => {}) }),
  ) =>
    renderWithApi(
      <StickerBoard {...(freshId && { freshId })} onDraw={() => {}} onOpenGift={() => {}} />,
      api,
    );
  /** Turns the board over, or back, with its name button. */
  const flip = (host: HTMLElement) => {
    // A turn that never lands, and isn't played in reverse: happy-dom's cancel of a playing one rejects unhandled.
    vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
    vi.spyOn(Animation.prototype, "reverse").mockImplementation(() => {});
    act(() => host.querySelector<HTMLElement>(".board-who")?.click());
  };
  const byMika = () =>
    boardSticker({ placement: at(0.3), sticker: sticker({ artist: people.mika }) });

  it("name the artists of foil stickers once per app open, not on every visit to the board", () => {
    keep(TEST_ME.id, byMika());
    const visit = () => {
      const view = openBoard();
      const names = chipped(view.host);
      view.unmount();
      return names;
    };
    expect(visit()).toEqual(["@mika"]);
    expect(visit()).toEqual([]);
  });

  it("name a received sticker's artist alone as it lands, after the greeting has played too", async () => {
    const [a, b] = [
      byMika(),
      boardSticker({ placement: at(0.7), sticker: sticker({ artist: people.ken }) }),
    ];
    // A received sticker has no spot until the board gives it one.
    const received = boardSticker({ placement: null, sticker: sticker({ artist: people.bob }) });
    keep(TEST_ME.id, a, b);

    const first = openBoard();
    expect(chipped(first.host)).toEqual(["@ken", "@mika"]);
    first.unmount();

    // Receiving mounts the board again, with the sticker on it.
    const view = openBoard(
      received.stickerId,
      emptyApi({
        stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [a, b, received] }),
        stickerDetail: () =>
          Promise.resolve({
            sticker: received.sticker,
            owner: TEST_OWNER,
            transferTrail: [],
            hasTimelapse: false,
          }),
      }),
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(chipped(view.host)).toEqual(["@bob"]);

    // Its chip plays on once the sticker has stuck.
    const landing = () => view.host.querySelector(".is-landing");
    expect(landing()).not.toBeNull();
    await vi.waitFor(
      async () => {
        await act(async () => {});
        expect(landing()).toBeNull();
      },
      { timeout: 4000 },
    );
    expect(chipped(view.host)).toEqual(["@bob"]);
  });

  it("reload your User Stats each time the board turns over", async () => {
    const stats = (direct: number) => ({
      since: "2026-10-01T00:00:00.000Z",
      made: 1,
      received: 0,
      given: 1,
      gratitude: { direct, residual: 0, total: direct },
      bests: { bestCombo: 0, mostGratitudeInADay: direct, longestStreak: 1 },
      streak: 1,
    });
    const userStats = vi
      .fn<ApiClient["userStats"]>()
      .mockResolvedValueOnce(stats(0))
      .mockResolvedValueOnce(stats(120));
    const view = openBoard(
      undefined,
      emptyApi({ stickerBoard: () => new Promise(() => {}), userStats }),
    );
    unmount = view.unmount;

    flip(view.host);
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(userStats).toHaveBeenCalledTimes(1);
    });
    flip(view.host);
    flip(view.host);
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(userStats).toHaveBeenCalledTimes(2);
    });
  });

  it("end with a turn of the board while they play, and don't start over when it turns back", () => {
    keep(TEST_ME.id, byMika());
    const view = openBoard();
    unmount = view.unmount;
    expect(chipped(view.host)).toEqual(["@mika"]);

    flip(view.host);
    flip(view.host);
    expect(chipped(view.host)).toEqual([]);
  });
});

/** Your board on a phone, with `boardStickers` on it, once it has loaded. */
const visitBoard = async (...boardStickers: ApiBoardSticker[]) => {
  onAPhone();
  const view = renderWithApi(
    <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
    emptyApi({ stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers }) }),
  );
  unmount = view.unmount;
  await act(async () => {});
  return view;
};

describe("StickerBoard's first-selection hint", () => {
  const toolbar = (host: HTMLElement) => host.querySelector(".sticker-toolbar");
  const hint = (host: HTMLElement) => host.querySelector(".sticker-toolbar__hint");

  it("hangs off the toolbar of the first sticker you select, hidden from screen readers, and not off a later selection", async () => {
    const a = boardSticker({ placement: at(0.5) });
    const view = await visitBoard(a);
    const press = selectByKeys(view.host, a.stickerId);
    expect(hint(view.host)?.getAttribute("aria-hidden")).toBe("true");

    // Letting go ends it for good: the same sticker selected again has its toolbar and no hint.
    press("Escape");
    expect(toolbar(view.host)).toBeNull();
    press("Enter");
    expect(toolbar(view.host)).not.toBeNull();
    expect(hint(view.host)).toBeNull();
  });

  it("stays through a selection that moves to another sticker, and doesn't come back on a later visit", async () => {
    const [a, b] = [boardSticker({ placement: at(0.3) }), boardSticker({ placement: at(0.7) })];
    const first = await visitBoard(a, b);
    selectByKeys(first.host, a.stickerId);
    selectByKeys(first.host, b.stickerId);
    expect(hint(first.host)).not.toBeNull();
    await act(() => vi.dynamicImportSettled());
    first.unmount();

    // A new page open remembers it from this device's storage.
    forgetSelectionHints();
    const later = await visitBoard(a, b);
    selectByKeys(later.host, a.stickerId);
    expect(toolbar(later.host)).not.toBeNull();
    expect(hint(later.host)).toBeNull();
  });
});

describe("StickerBoard's Arrange", () => {
  afterEach(() => vi.useRealTimers());
  const arrangeTile = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>(".sticker-toolbar__arrange-toggle");
  const stepTiles = (host: HTMLElement) => host.querySelectorAll(".sticker-toolbar__step");

  it("is closed until opened, then stays open for the next selection and the next visit", async () => {
    const [a, b] = [boardSticker({ placement: at(0.3) }), boardSticker({ placement: at(0.7) })];
    const first = await visitBoard(a, b);
    selectByKeys(first.host, a.stickerId);
    expect(stepTiles(first.host)).toHaveLength(0);
    act(() => arrangeTile(first.host)?.click());
    selectByKeys(first.host, b.stickerId);
    expect(stepTiles(first.host).length).toBeGreaterThan(0);
    await act(() => vi.dynamicImportSettled());
    first.unmount();

    const later = await visitBoard(a, b);
    selectByKeys(later.host, a.stickerId);
    expect(arrangeTile(later.host)?.getAttribute("aria-expanded")).toBe("true");
  });

  it("reads out what a run of steps did once it settles", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const a = boardSticker({ placement: at(0.5) });
    const view = await visitBoard(a);
    selectByKeys(view.host, a.stickerId)("ArrowRight");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    // The words land a frame after the line is cleared, so the same words twice are read twice.
    await act(() => new Promise((done) => setImmediate(done)));
    expect(view.host.querySelector(".board-steps-status")?.textContent).toBe(
      stickerBoard.toolbar.arrange.moved.right.en,
    );
  });
});

describe("StickerBoard after a gift", () => {
  const given = () =>
    boardSticker({
      placement: at(0.3),
      held: false,
      givenTo: { receiver: people.bob, receivedAt: "2026-09-23T11:52:00.000Z" },
    });
  const show = async (...boardStickers: ApiBoardSticker[]) => {
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers }),
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    const stage = view.host.querySelector<HTMLElement>(".board-stage");
    if (!stage) throw new Error("The board has no stage");
    return stage;
  };

  it("loads the board and the gifts on their way again when the server hears of a send late", async () => {
    const stickerBoard = vi.fn(async () => ({
      owner: TEST_OWNER,
      boardStickers: [boardSticker({ placement: at(0.5) })],
    }));
    const pendingGifts = vi.fn(async () => ({ gifts: [] }));
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard, pendingGifts }),
    );
    unmount = view.unmount;
    await act(async () => {});
    const loads = [stickerBoard.mock.calls.length, pendingGifts.mock.calls.length];

    await act(async () => myStickerBoardChanged());
    expect([stickerBoard.mock.calls.length, pendingGifts.mock.calls.length]).toEqual(
      loads.map((n) => n + 1),
    );
  });

  it("leaves a given sticker off the board, and out of the count", async () => {
    const gone = given();
    const kept = boardSticker({ placement: at(0.7) });
    const stage = await show(gone, kept);
    expect(shownIds(stage)).toEqual([kept.stickerId]);
    expect(stage.querySelector(`[data-sticker-id="${gone.stickerId}"]`)).toBeNull();
    expect(stage.querySelector(".placed-sticker")?.getAttribute("aria-label")).toMatch(/1 of 1$/);
    expect(stage.querySelector(".board-blank")).toBeNull();
  });

  it("shows the empty board when every sticker was given", async () => {
    const stage = await show(given());
    expect(shownIds(stage)).toEqual([]);
    expect(stage.querySelector(".board-blank")).not.toBeNull();
  });

  it("opens a given sticker among the stickers you gave from its spot in the tray", async () => {
    const gone = given();
    // Noticed already, so no notice covers the board.
    markNoticed([
      { stickerId: gone.stickerId, receivedAt: Date.parse("2026-09-23T11:52:00.000Z") },
    ]);
    const stage = await show(gone, boardSticker({ placement: at(0.7) }));
    // The sticker tray loads with the board.
    await act(() => vi.dynamicImportSettled());
    const spot = stage
      .closest(".board")
      ?.querySelector<HTMLElement>(`.tray__slot[data-id="${gone.stickerId}"]`);
    expect(spot?.getAttribute("aria-label")).toMatch(/^No\.\d{4}, given to @bob\. Open it$/);

    act(() => spot?.click());
    await act(() => vi.dynamicImportSettled());
    const detail = document.querySelector(".sticker-detail");
    expect(detail?.querySelector("nav")?.getAttribute("aria-label")).toBe("Stickers you gave");
    // Only the stickers you gave page past, and it says who has this one.
    expect(detail?.querySelectorAll(".sticker-detail__thumb")).toHaveLength(1);
    expect(detail?.textContent).toContain("You gave it to @bob");
  });

  const gave = (receiver: Person, receivedAt: string) =>
    boardSticker({ held: false, givenTo: { receiver, receivedAt } });
  const noticeTitle = () => document.querySelector(".gift-received-notice h1")?.textContent?.trim();

  it("draws no notice for gifts received before this device's first board", async () => {
    await show(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    expect(noticeTitle()).toBeUndefined();
  });

  it("gives each gift received since the last visit its own notice, newest first", async () => {
    // This device has shown a notice before.
    noticeReceivesFromNow([]);
    await show(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    const title = noticeTitle;
    const close = () =>
      act(() => document.querySelector<HTMLElement>(".gift-received-notice .label-btn")?.click());
    expect(title()).toBe("@bob received your sticker");
    close();
    expect(title()).toBe("@mika received your sticker");
    close();
    expect(document.querySelector(".gift-received-notice")).toBeNull();
  });
});

describe("StickerBoard's sticker tray", () => {
  it("moves focus to a sticker on the board when its hole's Show it is pressed", async () => {
    const a = boardSticker({ placement: at(0.3) });
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [a] }),
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    await act(() => vi.dynamicImportSettled());
    const hole = view.host.querySelector<HTMLElement>(`.tray__slot[data-id="${a.stickerId}"]`);
    expect(hole?.getAttribute("aria-label")).toMatch(/on your board\. Show it$/);

    act(() => {
      hole?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(document.activeElement).toBe(
      view.host.querySelector(`[data-sticker-id="${a.stickerId}"]`),
    );
  });
});

describe("StickerBoard saving where a sticker sits", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps one save of a sticker in flight, then sends only its latest spot, whose failure stays", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: at(0.5) });
    let land = () => {};
    const saveStickerPlacement = vi
      .fn<ApiClient["saveStickerPlacement"]>()
      .mockImplementationOnce(
        (stickerId, placement) =>
          new Promise((resolve) => {
            land = () => resolve({ stickerId, placement, seenAt: null, arrivedAt: a.arrivedAt });
          }),
      )
      .mockRejectedValue(new ApiError(503, { error: "not_in_test", detail: "The board is down" }));
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({
        stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [a] }),
        saveStickerPlacement,
      }),
    );
    unmount = view.unmount;
    await act(async () => {});
    const press = selectByKeys(view.host, a.stickerId);
    // Each burst of keys is one save, so three bursts are three saves, the first in flight.
    for (let burst = 0; burst < 3; burst++) {
      press("ArrowLeft");
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    }
    expect(saveStickerPlacement).toHaveBeenCalledOnce();

    await act(async () => land());
    expect(saveStickerPlacement).toHaveBeenCalledTimes(2);
    const shown = keptBoardFor(TEST_ME.id)?.stickers[0].placement;
    expect(saveStickerPlacement.mock.lastCall?.[1]).toEqual(shown && toApiPlacement(shown));
    expect(view.host.querySelector(".board-alerts")).not.toBeNull();
  });
});

describe("StickerBoard on the visit after a move", () => {
  afterEach(() => vi.useRealTimers());

  /**
   * Two visits with one client, as leaving the board and coming back makes them: the first moves
   * the sticker and saves it, to a server that keeps the spot saved last.
   */
  async function visitAfterAMove(sticker: ApiBoardSticker) {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    let onServer = sticker.placement;
    const api = emptyApi({
      stickerBoard: () =>
        Promise.resolve({
          owner: TEST_OWNER,
          boardStickers: [{ ...sticker, placement: onServer }],
        }),
      saveStickerPlacement: (stickerId, placement) => {
        onServer = placement;
        return Promise.resolve({
          stickerId,
          placement,
          seenAt: null,
          arrivedAt: sticker.arrivedAt,
        });
      },
    });
    const visit = async () => {
      const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
      unmount = view.unmount;
      // The board loads, and saves any spot it gives.
      await act(async () => {});
      await act(async () => {});
      return view;
    };
    const first = await visit();
    const before = onServer;
    selectByKeys(first.host, sticker.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    const moved = onServer;
    expect(moved).not.toEqual(before);
    await act(() => vi.dynamicImportSettled());
    first.unmount();

    await visit();
    const shown = keptBoardFor(TEST_ME.id)?.stickers[0].placement;
    return { moved, onServer, shown: shown && toApiPlacement(shown) };
  }

  it("shows the sticker where it was moved", async () => {
    const { moved, shown } = await visitAfterAMove(boardSticker({ placement: at(0.5) }));
    expect(shown).toEqual(moved);
  });

  it("leaves a sticker the board placed itself where it was moved, on the server too", async () => {
    // Received: it has no spot until the board gives it one.
    const { moved, onServer, shown } = await visitAfterAMove(boardSticker({ placement: null }));
    expect(shown).toEqual(moved);
    expect(onServer).toEqual(moved);
  });
});

describe("StickerBoard after sending a gift", () => {
  it("loads again when its fresh load had failed, so the sticker on its way leaves the board", async () => {
    const a = boardSticker({ placement: at(0.3) });
    keep(TEST_ME.id, a);
    const onItsWay = { ...a, openGift: { id: "g1", status: "sent" as const, for: null } };
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockRejectedValueOnce(
        new ApiError(503, { error: "not_in_test", detail: "The board is down" }),
      )
      .mockResolvedValue({ owner: TEST_OWNER, boardStickers: [onItsWay] });
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard }),
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(view.host.querySelector(".board-problem")).not.toBeNull();

    const el = view.host.querySelector<HTMLElement>(`[data-sticker-id="${a.stickerId}"]`);
    act(() => {
      el?.focus();
      el?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    const give = [...view.host.querySelectorAll<HTMLElement>(".sticker-toolbar button")].find(
      (button) => button.textContent === "Give",
    );
    act(() => give?.click());
    await act(() => vi.dynamicImportSettled());
    act(() => document.querySelector<HTMLElement>(".test-gift-sent")?.click());
    await act(async () => {});
    expect(shownIds(view.host)).toEqual([]);
  });
});

describe("StickerBoard after receiving", () => {
  it("asks about gratitude for a sticker that came back to your sticker tray", async () => {
    // Placed before you gave it, so it comes back to the tray rather than landing on the board.
    const back = boardSticker({ placement: { ...at(0.3), onBoard: false } });
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [back] }),
      stickerDetail: () =>
        Promise.resolve({
          sticker: back.sticker,
          owner: TEST_OWNER,
          transferTrail: [trailEntry({ giftId: "g1", receiver: TEST_OWNER })],
          hasTimelapse: false,
        }),
    });
    const view = renderWithApi(
      <StickerBoard freshId={back.stickerId} onDraw={() => {}} onOpenGift={() => {}} />,
      api,
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(document.querySelector(".send-gratitude-sheet")).not.toBeNull();
  });
});

describe("StickerBoard while it loads", () => {
  it("shows faint sticker shapes until the board's stickers arrive", async () => {
    let answer: (board: LoadedBoard) => void = () => {};
    const api = emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    const shapes = () => view.host.querySelectorAll(".board-loading-sticker").length;
    expect(shapes()).toBeGreaterThan(0);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe("Loading your stickers");

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [] }));
    expect(shapes()).toBe(0);
  });
});

describe("StickerBoard when the app's language changes", () => {
  afterEach(async () => {
    await i18next.changeLanguage("en");
  });

  it("names a deleted account's sticker in the new language", async () => {
    const gone: Person = { ...people.ken, handle: null, lineDisplayName: null };
    const theirs = boardSticker({ placement: at(0.5), sticker: sticker({ artist: gone }) });
    const view = await visitBoard(theirs);
    const label = () =>
      view.host
        .querySelector(`[data-sticker-id="${theirs.stickerId}"]`)
        ?.getAttribute("aria-label");
    expect(label()).toContain(apiStrings.person.unnamed.en);
    await act(() => i18next.changeLanguage("ja"));
    expect(label()).toContain(apiStrings.person.unnamed.ja);
  });

  it("says why a spot didn't save in the new language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({
        // The board gives an unplaced sticker a spot, and saves it.
        stickerBoard: () =>
          Promise.resolve({
            owner: TEST_OWNER,
            boardStickers: [boardSticker({ placement: null })],
          }),
        saveStickerPlacement: () =>
          Promise.reject(new ApiError(0, { error: "network", detail: "Failed to fetch" })),
      }),
    );
    unmount = view.unmount;
    await act(async () => {});
    const alert = () => view.host.querySelector(".board-alerts")?.textContent;
    expect(alert()).toContain(withBreakHints(errors.network.en));
    await act(() => i18next.changeLanguage("ja"));
    expect(alert()).toContain(withBreakHints(errors.network.ja));
  });
});

describe("StickerBoard when your NSFW opt-in changes", () => {
  const DRAWING = "https://box.test/drawing.webp";
  const VEILED = "https://cdn.test/veiled.webp";
  /** Your NSFW sticker as the server sends it to you opted in, or not. */
  const nsfwSticker = (optedIn: boolean) => {
    const s = sticker({ id: "nsfw", number: 7, nsfw: true, artist: TEST_OWNER });
    return {
      ...s,
      images: { ...s.images, webp: { ...s.images.webp, sticker: optedIn ? DRAWING : VEILED } },
    };
  };
  const boardFor = (optedIn: boolean): LoadedBoard => ({
    owner: { ...TEST_OWNER, nsfwOptIn: optedIn },
    boardStickers: [boardSticker({ placement: at(0.5), sticker: nsfwSticker(optedIn) })],
  });
  const sentFor = (optedIn: boolean) => ({
    gifts: [{ gift: gift(), sticker: nsfwSticker(optedIn), for: null }],
  });

  /** Your board opted in, its drawing on the board and on the badge; `later` answers each load after the first. */
  async function optedInBoard(later: ApiClient["stickerBoard"]) {
    onAPhone();
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce(boardFor(true))
      .mockImplementation(later);
    const pendingGifts = vi
      .fn<ApiClient["pendingGifts"]>()
      .mockResolvedValueOnce(sentFor(true))
      .mockResolvedValue(sentFor(false));
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard, pendingGifts }),
      { ...TEST_ME, nsfwOptIn: true },
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(view.host.innerHTML).toContain(DRAWING);
    return { view, stickerBoard };
  }
  const optOut = (view: ReturnType<typeof renderWithApi>) =>
    view.setMe({ ...TEST_ME, nsfwOptIn: false });
  afterEach(() => vi.useRealTimers());

  it("shows no NSFW drawing from the moment you opt out, until your board loads under the new setting", async () => {
    let answer: (board: LoadedBoard) => void = () => {};
    const { view, stickerBoard } = await optedInBoard(
      () => new Promise((resolve) => (answer = resolve)),
    );
    optOut(view);
    expect(view.host.innerHTML).not.toContain(DRAWING);
    expect(stickerBoard).toHaveBeenCalledTimes(2);
    await act(async () => answer(boardFor(false)));
    expect(view.host.innerHTML).toContain(VEILED);
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });

  it("keeps them hidden, and says the board didn't load, when that load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { view } = await optedInBoard(() =>
      Promise.reject(new ApiError(0, { error: "network", detail: "Failed to fetch" })),
    );
    optOut(view);
    await act(async () => {});
    expect(view.host.querySelector(".board-problem")).not.toBeNull();
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });

  it("doesn't keep the board on this phone until it has loaded under the new setting", async () => {
    // A key's step is committed, which changes the board's stickers, once the keys go quiet.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { view } = await optedInBoard(() => new Promise(() => {}));
    optOut(view);
    forget();
    selectByKeys(view.host, "nsfw")("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
  });

  it("hides them in the board kept on this phone when the setting changed after it was kept", () => {
    keepBoard(TEST_ME.id, {
      owner: toPerson({ ...TEST_OWNER, nsfwOptIn: true }),
      stickers: placeUnplaced(boardFor(true).boardStickers.map(toBoardSticker)).stickers,
    });
    onAPhone();
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard: () => new Promise(() => {}) }),
    );
    unmount = view.unmount;
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });

  it("shows no NSFW drawing in a received gift's notice from a board kept under the other setting", () => {
    // This device has shown a notice before, so a gift received since gets one.
    noticeReceivesFromNow([]);
    const given = boardSticker({
      sticker: nsfwSticker(true),
      held: false,
      givenTo: { receiver: people.bob, receivedAt: "2026-09-23T11:52:00.000Z" },
    });
    keepBoard(TEST_ME.id, {
      owner: toPerson({ ...TEST_OWNER, nsfwOptIn: true }),
      stickers: placeUnplaced([toBoardSticker(given)]).stickers,
    });
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard: () => new Promise(() => {}) }),
    );
    unmount = view.unmount;
    expect(document.querySelector(".gift-received-notice")).not.toBeNull();
    expect(document.body.innerHTML).not.toContain(DRAWING);
  });
});
