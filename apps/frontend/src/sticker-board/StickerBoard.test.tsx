// @vitest-environment happy-dom
import type {
  BoardSticker as ApiBoardSticker,
  StickerBoard as LoadedBoard,
  Me,
  Person,
  StickerPlacement,
} from "@drawing-app/api/client";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { act, useEffect, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { boardSticker, people, sticker, trailEntry } from "../api/testFixtures";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { toApiPlacement, toPerson, toRecordPlacement } from "../api/views";
import { forgetNoticedHere, markNoticed, noticeReceivesFromNow } from "../giving/noticedGifts";
import { errorMessage } from "../i18n/errorMessage";
import { i18next, withBreakHints } from "../i18n/i18n";
import { api as apiStrings } from "../i18n/strings/api";
import { errors } from "../i18n/strings/errors";
import { stickerBoard } from "../i18n/strings/stickerBoard";
import { SessionKeeper } from "../sticker-creation/session/keptSession";
import { formatMonthDay, formatNo, spokenDuration } from "../stickers/format";
import type { Sheet } from "../tickets/ticketsContext";
import { useTickets } from "../tickets/useTickets";
import { TabsLeadSlot } from "../ui/TabsLead";
import { inLanguage, onLargeScreen } from "../ui/testing";
import { forgetGreetings } from "./artistChipGreeting";
import { forgetBoardComplete } from "./boardComplete";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { deriveLargeLayout } from "./largeLayout";
import {
  forgetKeptBoard,
  forgetsSoFar,
  KEPT_BOARD_KEY,
  keepBoard,
  keptBoardFor,
  readKeptBoardAgain,
} from "./lastBoard";
import { unitOf } from "./placement";
import { StickerBoard } from "./StickerBoard";
import { myStickerBoardChanged } from "./useMyStickerBoard";
import { placedAt } from "./testBoardSticker";
import { STEP_SAVE_IDLE_MS } from "./useBoardGestures";

// The board's chat menu and Privy reach LINE's SDK; nothing here needs it to answer.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
// The stat board mounts once the board is idle; its developer slip's LINE details read LIFF's context.
vi.mock("../line/LineDetails", () => ({ LineDetails: () => null }));
// Giving itself isn't tested here: it closes, sent or not, at a tap, from a board that can give.
vi.mock("../giving/useGiftSender", () => ({ useGiftSender: () => ({}) }));
vi.mock("../giving/Giving", () => ({
  Giving: ({ onClose }: { onClose: (sent: boolean) => void }) => (
    <>
      <button type="button" className="test-gift-sent" onClick={() => onClose(true)}>
        Sent
      </button>
      <button type="button" className="test-gift-unsent" onClick={() => onClose(false)}>
        Not sent
      </button>
    </>
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
  // The developer slip asks it who's signed in once a .env names demo people (VITE_DEMO_PEOPLE).
  mockPerson: () => ({ sub: "U1", name: "You" }),
}));

/** Why a request that got no answer failed, as the board's alerts give it. */
const NETWORK_ERROR = i18next.t(($) => $.errors.network);

let unmount = () => {};
afterEach(async () => {
  vi.useRealTimers();
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
});

const shownIds = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>(".placed-sticker")].map((el) => el.dataset.stickerId);
const keep = (userId: string, ...stickers: ApiBoardSticker[]) =>
  keepBoard(
    userId,
    { owner: toPerson(TEST_OWNER), stickers: placeUnplaced(stickers.map(toBoardSticker)).stickers },
    forgetsSoFar(),
  );
/** happy-dom lays nothing out: the board is given a phone's size, so each arrow key moves a sticker. */
const onAPhone = () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(657);
};

/** An 11-inch iPad's board in Safari, upright: a large screen. */
const onAnIpad = () => {
  onLargeScreen();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(820);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1022);
};

/** A server holding these stickers, which keeps every spot saved in either layout, and a client over it. */
function boardServer(...stickers: ApiBoardSticker[]) {
  const onServer = new Map(stickers.map((s) => [s.stickerId, s]));
  const keepSpots = (
    stickerId: string,
    spots: Partial<Pick<ApiBoardSticker, "placement" | "largePlacement">>,
  ): StickerPlacement => {
    const before = onServer.get(stickerId);
    if (!before) throw new Error(`${stickerId} never reached you`);
    const s = { ...before, ...spots };
    onServer.set(stickerId, s);
    const { placement, largePlacement, seenAt, arrivedAt } = s;
    return { stickerId, placement, largePlacement, seenAt, arrivedAt };
  };
  const saveStickerPlacement = vi.fn<ApiClient["saveStickerPlacement"]>((stickerId, spots) =>
    Promise.resolve(keepSpots(stickerId, spots)),
  );
  // As the server does: a derived spot only where none is saved.
  const saveLargeLayout = vi.fn<ApiClient["saveLargeLayout"]>((entries) =>
    Promise.resolve(
      entries.map(({ stickerId, largePlacement }) =>
        keepSpots(stickerId, {
          largePlacement: onServer.get(stickerId)?.largePlacement ?? largePlacement,
        }),
      ),
    ),
  );
  const api = emptyApi({
    stickerBoard: () =>
      Promise.resolve({ owner: TEST_OWNER, boardStickers: [...onServer.values()] }),
    saveStickerPlacement,
    saveLargeLayout,
  });
  return { api, onServer, saveStickerPlacement, saveLargeLayout };
}

/** A client whose board holds `boardStickers`, over `overrides`. */
const boardApi = (boardStickers: ApiBoardSticker[] = [], overrides: Partial<ApiClient> = {}) =>
  emptyApi({
    stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers }),
    ...overrides,
  });

/** A client whose board never finishes loading, over `overrides`. */
const stillLoading = (overrides: Partial<ApiClient> = {}) =>
  emptyApi({ stickerBoard: () => new Promise<LoadedBoard>(() => {}), ...overrides });

/** Your board on `api`, as `me`, rendered and not yet loaded; it goes when the test ends. */
function renderBoard(
  api: ApiClient,
  props: Partial<ComponentProps<typeof StickerBoard>> = {},
  me?: Me,
) {
  const view = renderWithApi(
    <StickerBoard onDraw={() => {}} onOpenGift={() => {}} {...props} />,
    api,
    me,
  );
  unmount = view.unmount;
  return view;
}

/** Your board on `api`, once it has loaded and saved the spots it gives. */
async function openBoard(
  api: ApiClient,
  props: Partial<ComponentProps<typeof StickerBoard>> = {},
  me?: Me,
) {
  const view = renderBoard(api, props, me);
  await act(async () => {});
  await act(async () => {});
  return view;
}

/** Turns the board over, or back, with its name button. */
const flip = (host: HTMLElement) => {
  // A turn that never lands, and isn't played in reverse: happy-dom's cancel of a playing one rejects unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  vi.spyOn(Animation.prototype, "reverse").mockImplementation(() => {});
  act(() => host.querySelector<HTMLElement>(".board-who")?.click());
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
    const a = boardSticker({ placement: placedAt(0.3) });
    const b = boardSticker({ placement: placedAt(0.7) });
    keep(TEST_ME.id, a);
    let answer: (board: LoadedBoard) => void = () => {};
    const view = renderBoard(
      emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) }),
    );
    expect(view.host.querySelectorAll(".board-loading-sticker")).toHaveLength(0);
    expect(shownIds(view.host)).toEqual([a.stickerId]);

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [a, b] }));
    expect(new Set(shownIds(view.host))).toEqual(new Set([a.stickerId, b.stickerId]));
    // The fresh board is kept for the next open.
    expect(keptBoardFor(TEST_ME.id)?.stickers.map((s) => s.id)).toEqual([a.stickerId, b.stickerId]);
  });

  it("takes the fresh board's spots over the kept ones", async () => {
    const a = boardSticker({ placement: placedAt(0.3) });
    keep(TEST_ME.id, a);
    const moved = { ...a, placement: placedAt(0.6) };
    await openBoard(boardApi([moved]));
    expect(keptBoardFor(TEST_ME.id)?.stickers[0].placements.phone.x).toBe(0.6);
  });

  /** Opens your board on `server` from the board kept on this phone, its fresh load waiting for `land`. */
  function openFromKept(server: ReturnType<typeof boardServer>) {
    onAPhone();
    let answer = () => {};
    const stickerBoard = () =>
      new Promise<LoadedBoard>((resolve) => (answer = () => resolve(server.api.stickerBoard())));
    const view = renderBoard({ ...server.api, stickerBoard });
    return { host: view.host, land: () => act(async () => answer()) };
  }
  const keptSpots = (s: ApiBoardSticker) =>
    keptBoardFor(TEST_ME.id)?.stickers.find((k) => k.id === s.stickerId)?.placements;

  it("takes the fresh board's spot for a sticker only raised while it loaded", async () => {
    const under = boardSticker({ placement: placedAt(0.3) });
    const over = boardSticker({ placement: { ...placedAt(0.7), z: 2 } });
    keep(TEST_ME.id, under, over);
    // Moved on another device since this phone kept its board.
    const { host, land } = openFromKept(boardServer({ ...under, placement: placedAt(0.5) }, over));
    selectByKeys(host, under.stickerId);
    await land();
    expect(keptSpots(under)?.phone).toEqual(toRecordPlacement(placedAt(0.5)));
  });

  it("leaves the large layout's spot alone for a sticker moved while it loaded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const [a, b] = [
      boardSticker({ placement: placedAt(0.3) }),
      boardSticker({ placement: placedAt(0.7) }),
    ];
    keep(TEST_ME.id, a, b);
    // Since this phone kept its board, another device saved a large layout.
    const server = boardServer(
      { ...a, largePlacement: placedAt(0.35) },
      { ...b, largePlacement: placedAt(0.65) },
    );
    const { host, land } = openFromKept(server);
    selectByKeys(host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await land();
    await act(async () => {});
    expect(server.onServer.get(a.stickerId)?.largePlacement).toEqual(placedAt(0.35));
    expect(keptSpots(a)?.large).toEqual(toRecordPlacement(placedAt(0.35)));
    expect(keptSpots(a)?.phone.x).toBeLessThan(0.3);
  });

  it("never draws a board kept for someone else, and forgets it", () => {
    keep("someone-else", boardSticker({ placement: placedAt(0.3) }));
    const view = renderBoard(stillLoading());
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEPT_BOARD_KEY)).toBeNull();
  });
});

describe("StickerBoard's check for gratitude to send", () => {
  it("says so when the check for the sticker that just arrived fails, and Try again asks again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const a = boardSticker({ placement: placedAt(0.3) });
    const busy = new ApiError(503, { error: "unavailable", detail: "database is busy" });
    const stickerDetail = vi
      .fn<ApiClient["stickerDetail"]>()
      .mockRejectedValueOnce(busy)
      .mockRejectedValue(new ApiError(404, { error: "sticker_not_found", detail: "gone" }));
    const view = await openBoard(boardApi([a], { stickerDetail }), { freshId: a.stickerId });
    const alert = () => view.host.querySelector(".board-alerts")?.textContent;
    expect(alert()).toContain(
      i18next.t(($) => $.stickerBoard.board.gratitudeCheckFailed, { reason: errorMessage(busy) }),
    );
    expect(alert()).toContain("database is busy");

    const again = view.host.querySelector<HTMLElement>(".board-alerts .label-btn--quiet");
    await act(async () => again?.click());
    expect(stickerDetail).toHaveBeenCalledTimes(2);
    expect(alert()).toContain("gone");
  });

  it("says so beside a spot that didn't save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Received: the board gives it a spot, which doesn't save.
    const a = boardSticker({ placement: null });
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const view = await openBoard(
      boardApi([a], {
        stickerDetail: () => Promise.reject(offline),
        saveStickerPlacement: () => Promise.reject(offline),
      }),
      { freshId: a.stickerId },
    );
    const alerts = view.host.querySelectorAll(".board-alerts [role='alert']");
    expect([...alerts].map((alert) => alert.textContent)).toEqual([
      expect.stringContaining(
        i18next.t(($) => $.stickerBoard.board.unsaved, {
          count: 1,
          stickers: formatNo(a.sticker.number),
          reasons: NETWORK_ERROR,
        }),
      ),
      expect.stringContaining(
        i18next.t(($) => $.stickerBoard.board.gratitudeCheckFailed, { reason: NETWORK_ERROR }),
      ),
    ]);
  });
});

describe("StickerBoard's tickets", () => {
  it("says so over Draw when they didn't load, and Try again loads them again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tickets = vi
      .fn<ApiClient["tickets"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network", detail: "Failed to fetch" }))
      .mockResolvedValue(FRESH_TICKETS);
    const view = await openBoard(boardApi([], { tickets }));
    const alert = () => view.host.querySelector('.board-alerts [role="alert"]')?.textContent;
    expect(alert()).toContain(
      i18next.t(($) => $.stickerBoard.board.ticketsDidntLoad, { reason: NETWORK_ERROR }),
    );
    expect(view.host.textContent).toContain("Failed to fetch");

    const again = view.host.querySelector<HTMLElement>(".board-alerts .label-btn--quiet");
    await act(async () => again?.click());
    expect(tickets).toHaveBeenCalledTimes(2);
    expect(alert()).toBeUndefined();
  });
});

describe("StickerBoard while a drawing waits", () => {
  /** The drawing screen under the board, saying what its sheet needs from Draw. */
  function DrawingScreenSays({ sheet }: { sheet: Sheet }) {
    const { setSheet } = useTickets();
    useEffect(() => setSheet(sheet), [setSheet, sheet]);
    return null;
  }
  /** Your board with no stickers yet, over a drawing screen whose sheet is `sheet`. */
  const board = (sheet: Sheet) => (
    <>
      <DrawingScreenSays sheet={sheet} />
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />
    </>
  );
  const openOverDrawing = async (sheet: Sheet) => {
    const view = renderWithApi(board(sheet), boardApi());
    unmount = view.unmount;
    await act(async () => {});
    return {
      rerender: (next: Sheet) => view.rerender(board(next)),
      drawKey: () => view.host.querySelector(".board-draw .key")?.textContent,
      tip: () => view.host.querySelector(".board-nudge")?.textContent,
    };
  };
  const { draw, continueDrawing, firstSticker } = stickerBoard.board;

  it("says Draw continues the drawing the drawing screen holds, with no first-sticker tip, until its sheet is fresh", async () => {
    const shown = await openOverDrawing("held");
    expect(shown.drawKey()).toBe(continueDrawing.en);
    expect(shown.tip()).toBeUndefined();

    shown.rerender("fresh");
    expect(shown.drawKey()).toBe(draw.en);
    expect(shown.tip()).toBe(firstSticker.en);
  });

  it("says so after a reload, from the drawing this phone keeps, before the drawing screen has said", async () => {
    vi.stubGlobal("indexedDB", new FakeIndexedDB());
    onTestFinished(() => void vi.unstubAllGlobals());
    new SessionKeeper(TEST_ME.id).start(7);
    const shown = await openOverDrawing(null);
    expect(shown.drawKey()).toBe(continueDrawing.en);
    expect(shown.tip()).toBeUndefined();
  });
});

describe("StickerBoard's artist chips", () => {
  /** Whose artist chips are on the board, by their handles. */
  const chipped = (host: HTMLElement) =>
    [...host.querySelectorAll(".artist-chip-layer__chip .artist-chip__name")]
      .map((name) => name.textContent)
      .toSorted();
  /** A board mounted on its own, which its test takes down. */
  const mounted = (api: ApiClient, props: Partial<ComponentProps<typeof StickerBoard>> = {}) =>
    renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} {...props} />, api);
  const byMika = () =>
    boardSticker({ placement: placedAt(0.3), sticker: sticker({ artist: people.mika }) });

  it("name the artists of foil stickers once per app open, not on every visit to the board", () => {
    keep(TEST_ME.id, byMika());
    const visit = () => {
      const view = mounted(stillLoading());
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
      boardSticker({ placement: placedAt(0.7), sticker: sticker({ artist: people.ken }) }),
    ];
    // A received sticker has no spot until the board gives it one.
    const received = boardSticker({ placement: null, sticker: sticker({ artist: people.bob }) });
    keep(TEST_ME.id, a, b);

    const first = mounted(stillLoading());
    expect(chipped(first.host)).toEqual(["@ken", "@mika"]);
    first.unmount();

    // Receiving mounts the board again, with the sticker on it.
    const view = renderBoard(
      boardApi([a, b, received], {
        stickerDetail: () =>
          Promise.resolve({ sticker: received.sticker, owner: TEST_OWNER, transferTrail: [] }),
      }),
      { freshId: received.stickerId },
    );
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

  it("end with a turn of the board while they play, and don't start over when it turns back", () => {
    keep(TEST_ME.id, byMika());
    const view = renderBoard(stillLoading());
    expect(chipped(view.host)).toEqual(["@mika"]);

    flip(view.host);
    flip(view.host);
    expect(chipped(view.host)).toEqual([]);
  });
});

describe("StickerBoard's stat board", () => {
  it("reloads your User Stats each time the board turns over", async () => {
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
    const view = renderBoard(stillLoading({ userStats }));

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

  it("says why your User Stats didn't load in the app's language, after it changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const view = renderBoard(stillLoading({ userStats: () => Promise.reject(offline) }));
    const receipt = () => view.host.querySelector(".stat-board__receipt")?.textContent;

    flip(view.host);
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(receipt()).toContain(withBreakHints(errors.network.en));
    });
    await inLanguage("ja");
    expect(receipt()).toContain(withBreakHints(errors.network.ja));
  });
});

/** Your board on a phone, with `boardStickers` on it, once it has loaded. */
const visitBoard = (...boardStickers: ApiBoardSticker[]) => {
  onAPhone();
  return openBoard(boardApi(boardStickers));
};

describe("StickerBoard's Arrange", () => {
  const arrangeTile = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>(".sticker-toolbar__arrange-toggle");
  const stepTiles = (host: HTMLElement) => host.querySelectorAll(".sticker-toolbar__step");

  it("is closed until opened, then stays open for the next selection and the next visit", async () => {
    const [a, b] = [
      boardSticker({ placement: placedAt(0.3) }),
      boardSticker({ placement: placedAt(0.7) }),
    ];
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
    const a = boardSticker({ placement: placedAt(0.5) });
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

describe("StickerBoard's sticker detail", () => {
  it("opens on the sticker viewed, and pages through yours with the ones in a gift last", async () => {
    const inTheBag = boardSticker({
      placement: placedAt(0.2),
      openGift: { id: "g-packed", status: "packed", for: null },
    });
    const viewed = boardSticker({ placement: placedAt(0.5) });
    const after = boardSticker({ placement: placedAt(0.8) });
    const view = await visitBoard(inTheBag, viewed, after);
    selectByKeys(view.host, viewed.stickerId);
    const viewKey = [...view.host.querySelectorAll<HTMLElement>(".sticker-toolbar button")].find(
      (b) => b.textContent === stickerBoard.toolbar.view.en,
    );
    act(() => viewKey?.click());
    await act(() => vi.dynamicImportSettled());

    const shown = () =>
      document.querySelector(".sticker-detail h2 .sticker-detail__no")?.textContent;
    const page = (to: "next" | "previous") =>
      act(() =>
        [...document.querySelectorAll<HTMLElement>(".sticker-detail__pager button")]
          .find((b) => b.getAttribute("aria-label") === stickerBoard.detail[to].en)
          ?.click(),
      );
    const no = (s: ApiBoardSticker) => formatNo(s.sticker.number);
    expect(shown()).toBe(no(viewed));
    page("next");
    expect(shown()).toBe(no(after));
    page("next");
    expect(shown()).toBe(no(inTheBag));
    page("previous");
    expect(shown()).toBe(no(after));
  });
});

describe("StickerBoard after a gift", () => {
  /** When @bob received the sticker you gave him. */
  const RECEIVED_AT = "2026-09-23T11:52:00.000Z";
  const given = () =>
    boardSticker({
      placement: placedAt(0.3),
      held: false,
      givenTo: { receiver: people.bob, receivedAt: RECEIVED_AT },
    });
  /** Your board's stage, once your board with `boardStickers` has loaded. */
  const stageWith = async (...boardStickers: ApiBoardSticker[]) => {
    const view = await openBoard(boardApi(boardStickers));
    const stage = view.host.querySelector<HTMLElement>(".board-stage");
    if (!stage) throw new Error("The board has no stage");
    return stage;
  };

  it("loads the board again when the server hears of a send late", async () => {
    const stickerBoard = vi.fn(async () => ({
      owner: TEST_OWNER,
      boardStickers: [boardSticker({ placement: placedAt(0.5) })],
    }));
    await openBoard(emptyApi({ stickerBoard }));
    const loads = stickerBoard.mock.calls.length;

    await act(async () => myStickerBoardChanged());
    expect(stickerBoard).toHaveBeenCalledTimes(loads + 1);
  });

  it("leaves a given sticker off the board, and out of the count", async () => {
    const gone = given();
    const kept = boardSticker({ placement: placedAt(0.7) });
    const stage = await stageWith(gone, kept);
    expect(shownIds(stage)).toEqual([kept.stickerId]);
    expect(stage.querySelector(".placed-sticker")?.getAttribute("aria-label")).toBe(
      i18next.t(($) => $.stickerBoard.placedSticker.labelBy, {
        no: formatNo(kept.sticker.number),
        duration: spokenDuration(kept.sticker.timeUsed),
        artist: "@mika",
        position: 1,
        setSize: 1,
      }),
    );
    expect(stage.querySelector(".board-blank")).toBeNull();
  });

  it("shows the empty board when every sticker was given", async () => {
    const stage = await stageWith(given());
    expect(shownIds(stage)).toEqual([]);
    expect(stage.querySelector(".board-blank")).not.toBeNull();
  });

  it("opens a given sticker among the stickers you gave from its spot in the tray", async () => {
    const gone = given();
    // Noticed already, so no notice covers the board.
    markNoticed([{ stickerId: gone.stickerId, receivedAt: Date.parse(RECEIVED_AT) }]);
    const stage = await stageWith(gone, boardSticker({ placement: placedAt(0.7) }));
    // The sticker tray loads with the board.
    await act(() => vi.dynamicImportSettled());
    const spot = stage
      .closest(".board")
      ?.querySelector<HTMLElement>(`.tray__slot[data-id="${gone.stickerId}"]`);
    expect(spot?.getAttribute("aria-label")).toBe(
      i18next.t(($) => $.stickerBoard.tray.slot.given, {
        no: formatNo(gone.sticker.number),
        recipient: "@bob",
      }),
    );

    act(() => spot?.click());
    await act(() => vi.dynamicImportSettled());
    const detail = document.querySelector(".sticker-detail");
    expect(detail?.querySelector("nav")?.getAttribute("aria-label")).toBe(
      i18next.t(($) => $.stickerBoard.detail.stickersYouGave),
    );
    // Only the stickers you gave page past, and it says who has this one.
    expect(detail?.querySelectorAll(".sticker-detail__thumb")).toHaveLength(1);
    // The receiver's handle stands where the line's <receiver/> tag is.
    const youGaveIt = i18next.t(($) => $.stickerBoard.detail.youGaveIt, {
      day: formatMonthDay(Date.parse(RECEIVED_AT)),
    });
    expect(detail?.textContent).toContain(youGaveIt.replace("<receiver/>", "@bob"));
  });

  const gave = (receiver: Person, receivedAt: string) =>
    boardSticker({ held: false, givenTo: { receiver, receivedAt } });
  const noticeTitle = () => document.querySelector(".gift-received-notice h1")?.textContent?.trim();

  it("draws no notice for gifts received before this device's first board", async () => {
    await stageWith(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    expect(noticeTitle()).toBeUndefined();
  });

  it("gives each gift received since the last visit its own notice, newest first", async () => {
    // This device has shown a notice before.
    noticeReceivesFromNow([]);
    await stageWith(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    const close = () =>
      act(() => document.querySelector<HTMLElement>(".gift-received-notice .label-btn")?.click());
    expect(noticeTitle()).toBe(i18next.t(($) => $.giving.receivedNotice.title, { name: "@bob" }));
    close();
    expect(noticeTitle()).toBe(i18next.t(($) => $.giving.receivedNotice.title, { name: "@mika" }));
    close();
    expect(document.querySelector(".gift-received-notice")).toBeNull();
  });
});

describe("StickerBoard's sticker tray", () => {
  it("moves focus to a sticker on the board when its hole's Show it is pressed", async () => {
    const a = boardSticker({ placement: placedAt(0.3) });
    const view = await openBoard(boardApi([a]));
    await act(() => vi.dynamicImportSettled());
    const hole = view.host.querySelector<HTMLElement>(`.tray__slot[data-id="${a.stickerId}"]`);
    expect(hole?.getAttribute("aria-label")).toBe(
      i18next.t(($) => $.stickerBoard.tray.slot.used, { no: formatNo(a.sticker.number) }),
    );

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
  it("keeps one save of a sticker in flight, then sends only its latest spot, whose failure stays", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    let land = () => {};
    const saveStickerPlacement = vi
      .fn<ApiClient["saveStickerPlacement"]>()
      .mockImplementationOnce(
        (stickerId, spots) =>
          new Promise((resolve) => {
            land = () =>
              resolve({
                stickerId,
                placement: spots.placement ?? null,
                largePlacement: null,
                seenAt: null,
                arrivedAt: a.arrivedAt,
              });
          }),
      )
      .mockRejectedValue(new ApiError(503, { error: "not_in_test", detail: "The board is down" }));
    const view = await openBoard(boardApi([a], { saveStickerPlacement }));
    const press = selectByKeys(view.host, a.stickerId);
    // Each burst of keys is one save, so three bursts are three saves, the first in flight.
    for (let burst = 0; burst < 3; burst++) {
      press("ArrowLeft");
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    }
    expect(saveStickerPlacement).toHaveBeenCalledOnce();

    await act(async () => land());
    expect(saveStickerPlacement).toHaveBeenCalledTimes(2);
    const shown = keptBoardFor(TEST_ME.id)?.stickers[0].placements.phone;
    expect(saveStickerPlacement.mock.lastCall?.[1]).toEqual(
      shown && { placement: toApiPlacement(shown) },
    );
    expect(view.host.querySelector(".board-alerts")).not.toBeNull();
  });
});

describe("StickerBoard on the visit after a move", () => {
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
      saveStickerPlacement: (stickerId, spots) => {
        onServer = spots.placement ?? onServer;
        return Promise.resolve({
          stickerId,
          placement: onServer,
          largePlacement: null,
          seenAt: null,
          arrivedAt: sticker.arrivedAt,
        });
      },
    });
    const visit = () => openBoard(api);
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
    const shown = keptBoardFor(TEST_ME.id)?.stickers[0].placements.phone;
    return { moved, onServer, shown: shown && toApiPlacement(shown) };
  }

  it("shows the sticker where it was moved", async () => {
    const { moved, shown } = await visitAfterAMove(boardSticker({ placement: placedAt(0.5) }));
    expect(shown).toEqual(moved);
  });

  it("leaves a sticker the board placed itself where it was moved, on the server too", async () => {
    // Received: it has no spot until the board gives it one.
    const { moved, onServer, shown } = await visitAfterAMove(boardSticker({ placement: null }));
    expect(shown).toEqual(moved);
    expect(onServer).toEqual(moved);
  });
});

describe("StickerBoard after Giving", () => {
  /** Selects a board sticker and opens Giving from its toolbar's Give. */
  const openGiving = async (host: HTMLElement, stickerId: string) => {
    selectByKeys(host, stickerId);
    const give = [...host.querySelectorAll<HTMLElement>(".sticker-toolbar button")].find(
      (button) => button.textContent === i18next.t(($) => $.stickerBoard.toolbar.give),
    );
    act(() => give?.click());
    await act(() => vi.dynamicImportSettled());
  };

  it("loads again when Giving closes unsent, since its gift may have been packed or taken out", async () => {
    const a = boardSticker({ placement: placedAt(0.3) });
    const stickerBoard = vi.fn(async () => ({ owner: TEST_OWNER, boardStickers: [a] }));
    const view = await openBoard(emptyApi({ stickerBoard }));
    const loads = stickerBoard.mock.calls.length;

    await openGiving(view.host, a.stickerId);
    act(() => document.querySelector<HTMLElement>(".test-gift-unsent")?.click());
    await act(async () => {});
    expect(stickerBoard).toHaveBeenCalledTimes(loads + 1);
  });

  it("loads again when its fresh load had failed, so the sticker on its way leaves the board", async () => {
    const a = boardSticker({ placement: placedAt(0.3) });
    keep(TEST_ME.id, a);
    const onItsWay = { ...a, openGift: { id: "g1", status: "sent" as const, for: null } };
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockRejectedValueOnce(
        new ApiError(503, { error: "not_in_test", detail: "The board is down" }),
      )
      .mockResolvedValue({ owner: TEST_OWNER, boardStickers: [onItsWay] });
    const view = await openBoard(emptyApi({ stickerBoard }));
    expect(view.host.querySelector(".board-problem")).not.toBeNull();

    await openGiving(view.host, a.stickerId);
    act(() => document.querySelector<HTMLElement>(".test-gift-sent")?.click());
    await act(async () => {});
    expect(shownIds(view.host)).toEqual([]);
  });
});

describe("StickerBoard after receiving", () => {
  it("asks about gratitude for a sticker that came back to your sticker tray", async () => {
    // Placed before you gave it, so it comes back to the tray rather than landing on the board.
    const back = boardSticker({ placement: { ...placedAt(0.3), onBoard: false } });
    const stickerDetail = () =>
      Promise.resolve({
        sticker: back.sticker,
        owner: TEST_OWNER,
        transferTrail: [trailEntry({ giftId: "g1", receiver: TEST_OWNER })],
      });
    await openBoard(boardApi([back], { stickerDetail }), { freshId: back.stickerId });
    expect(document.querySelector(".send-gratitude-sheet")).not.toBeNull();
  });
});

describe("StickerBoard while it loads", () => {
  it("shows faint sticker shapes until the board's stickers arrive", async () => {
    let answer: (board: LoadedBoard) => void = () => {};
    const view = renderBoard(
      emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) }),
    );
    const shapes = () => view.host.querySelectorAll(".board-loading-sticker").length;
    expect(shapes()).toBeGreaterThan(0);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe(
      i18next.t(($) => $.stickerBoard.board.loading),
    );

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [] }));
    expect(shapes()).toBe(0);
  });
});

describe("StickerBoard when the app's language changes", () => {
  it("names a deleted account's sticker in the new language", async () => {
    const gone: Person = { ...people.ken, handle: null, lineDisplayName: null };
    const theirs = boardSticker({ placement: placedAt(0.5), sticker: sticker({ artist: gone }) });
    const view = await visitBoard(theirs);
    const label = () =>
      view.host
        .querySelector(`[data-sticker-id="${theirs.stickerId}"]`)
        ?.getAttribute("aria-label");
    expect(label()).toContain(apiStrings.person.unnamed.en);
    await inLanguage("ja");
    expect(label()).toContain(apiStrings.person.unnamed.ja);
  });

  it("says why a spot didn't save in the new language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The board gives an unplaced sticker a spot, and saves it.
    const view = await openBoard(
      boardApi([boardSticker({ placement: null })], {
        saveStickerPlacement: () =>
          Promise.reject(new ApiError(0, { error: "network", detail: "Failed to fetch" })),
      }),
    );
    const alert = () => view.host.querySelector(".board-alerts")?.textContent;
    expect(alert()).toContain(withBreakHints(errors.network.en));
    await inLanguage("ja");
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
    boardStickers: [boardSticker({ placement: placedAt(0.5), sticker: nsfwSticker(optedIn) })],
  });
  /** Your board opted in, its drawing on the board; `later` answers each load after the first. */
  async function optedInBoard(later: ApiClient["stickerBoard"]) {
    onAPhone();
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce(boardFor(true))
      .mockImplementation(later);
    const view = await openBoard(emptyApi({ stickerBoard }), {}, { ...TEST_ME, nsfwOptIn: true });
    expect(view.host.innerHTML).toContain(DRAWING);
    return { view, stickerBoard };
  }
  const optOut = (view: ReturnType<typeof renderWithApi>) =>
    view.setMe({ ...TEST_ME, nsfwOptIn: false });

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
    forgetKeptBoard();
    selectByKeys(view.host, "nsfw")("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
  });

  it("hides them in the board kept on this phone when the setting changed after it was kept", () => {
    keepBoard(
      TEST_ME.id,
      {
        owner: toPerson({ ...TEST_OWNER, nsfwOptIn: true }),
        stickers: placeUnplaced(boardFor(true).boardStickers.map(toBoardSticker)).stickers,
      },
      forgetsSoFar(),
    );
    onAPhone();
    const view = renderBoard(stillLoading());
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
    keepBoard(
      TEST_ME.id,
      {
        owner: toPerson({ ...TEST_OWNER, nsfwOptIn: true }),
        stickers: placeUnplaced([toBoardSticker(given)]).stickers,
      },
      forgetsSoFar(),
    );
    renderBoard(stillLoading());
    expect(document.querySelector(".gift-received-notice")).not.toBeNull();
    expect(document.body.innerHTML).not.toContain(DRAWING);
  });
});

describe("StickerBoard after the board kept on this phone is forgotten", () => {
  it("keeps nothing until a load since the forget lands", async () => {
    // A key's step is committed, which changes the board's stickers, once the keys go quiet.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    let land: (board: LoadedBoard) => void = () => {};
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce({ owner: TEST_OWNER, boardStickers: [a] })
      .mockImplementation(() => new Promise((resolve) => (land = resolve)));
    const view = await openBoard(emptyApi({ stickerBoard }));
    // As an 18+ mark or a gift taken out does.
    await act(async () => {
      forgetKeptBoard();
      myStickerBoardChanged();
    });
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(keptBoardFor(TEST_ME.id)).toBeNull();

    const marked = { ...a, sticker: { ...a.sticker, nsfw: true } };
    await act(async () => land({ owner: TEST_OWNER, boardStickers: [marked] }));
    expect(keptBoardFor(TEST_ME.id)?.stickers.map((s) => s.nsfw)).toEqual([true]);
  });
});

describe("StickerBoard's Draw on a large screen", () => {
  it("stands at the tab row's left end, in the slot the tab strip keeps, and leaves the board", async () => {
    onLargeScreen();
    const tabs = renderWithApi(<TabsLeadSlot />);
    onTestFinished(tabs.unmount);
    const { host } = await openBoard(emptyApi());
    expect(tabs.host.querySelector(".tabs-lead .board-draw")).not.toBeNull();
    expect(host.querySelector(".board-draw")).toBeNull();
  });
});

describe("StickerBoard's two layouts", () => {
  it("saves a move on a large screen to the large layout alone, leaving the phone's arrangement", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAnIpad();
    const a = boardSticker({ placement: placedAt(0.5), largePlacement: placedAt(0.3) });
    const server = boardServer(a);
    const { host } = await openBoard(server.api);
    selectByKeys(host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    const spots = server.saveStickerPlacement.mock.lastCall?.[1];
    expect(spots?.largePlacement?.x).toBeLessThan(0.3);
    expect(spots).not.toHaveProperty("placement");
    expect(server.onServer.get(a.stickerId)?.placement).toEqual(placedAt(0.5));
  });

  it("lands a new sticker on both layouts once your board has a large layout, from a phone too", async () => {
    onAPhone();
    const fresh = boardSticker();
    const server = boardServer(
      boardSticker({ placement: placedAt(0.5), largePlacement: placedAt(0.4) }),
      fresh,
    );
    await openBoard(server.api);
    expect(server.onServer.get(fresh.stickerId)).toMatchObject({
      placement: { onBoard: true },
      largePlacement: { onBoard: true },
    });
  });

  it("derives the large layout from the phone's the first time a large screen shows your board, and saves it once", async () => {
    onAnIpad();
    const [left, right] = [
      boardSticker({ placement: placedAt(0.2) }),
      boardSticker({ placement: placedAt(0.8) }),
    ];
    const server = boardServer(left, right);
    await openBoard(server.api);
    expect(server.saveLargeLayout).toHaveBeenCalledOnce();
    expect(server.saveStickerPlacement).not.toHaveBeenCalled();
    const large = (s: ApiBoardSticker) =>
      server.onServer.get(s.stickerId)?.largePlacement?.x ?? NaN;
    // The phone's arrangement at its own size on a wider board: nearer the middle, in the same order.
    expect([large(left) > 0.2, large(right) < 0.8, large(left) < large(right)]).toEqual([
      true,
      true,
      true,
    ]);
    expect([left, right].map((s) => server.onServer.get(s.stickerId)?.placement)).toEqual([
      placedAt(0.2),
      placedAt(0.8),
    ]);
    await act(() => vi.dynamicImportSettled());
    unmount();
    await openBoard(server.api);
    expect(server.saveLargeLayout).toHaveBeenCalledOnce();
  });

  it("takes the large layout another device saved first over the one it derived", async () => {
    onAnIpad();
    const [left, right] = [
      boardSticker({ placement: placedAt(0.2) }),
      boardSticker({ placement: placedAt(0.8) }),
    ];
    const server = boardServer(left, right);
    const theirs = [placedAt(0.3), placedAt(0.6)];
    // The other device saves its own as soon as this one has read the board.
    const stickerBoard = async () => {
      const board = await server.api.stickerBoard();
      [left, right].forEach((s, i) =>
        server.onServer.set(s.stickerId, { ...s, largePlacement: theirs[i] }),
      );
      return board;
    };
    await openBoard({ ...server.api, stickerBoard });
    await act(async () => {});
    expect(server.saveLargeLayout).toHaveBeenCalledOnce();
    const shown = keptBoardFor(TEST_ME.id)?.stickers.map((s) => s.placements.large);
    expect(shown).toEqual(theirs.map(toRecordPlacement));
  });

  it("derives the large layout for the large board when the screen turns large while it shows", async () => {
    const screen = onLargeScreen();
    screen.change(false);
    onAPhone();
    // Drawn big, so the phone's board is too narrow for the size it takes in the large layout.
    const big = boardSticker({
      placement: { ...placedAt(0.5), scale: 0.9 },
      sticker: sticker({ drawnWidth: 1600, drawnHeight: 1600 }),
    });
    const server = boardServer(big, boardSticker({ placement: placedAt(0.2) }));
    const phoneSpots = placeUnplaced([...server.onServer.values()].map(toBoardSticker)).stickers;
    await openBoard(server.api);
    expect(server.saveLargeLayout).not.toHaveBeenCalled();

    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(820);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1022);
    await act(async () => screen.change(true));
    const { derived } = deriveLargeLayout(phoneSpots, { W: 820, H: 1022, U: unitOf("large", 820) });
    for (const { id, placement } of derived)
      expect(server.onServer.get(id)?.largePlacement).toEqual(toApiPlacement(placement));
  });

  it("draws a board kept on this device on a large screen only once it has a large layout", () => {
    keep(TEST_ME.id, boardSticker({ placement: placedAt(0.3) }));
    onAnIpad();
    const view = renderBoard(stillLoading());
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
  });
});
