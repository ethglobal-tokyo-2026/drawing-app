// @vitest-environment happy-dom
import type {
  BoardSticker as ApiBoardSticker,
  StickerBoard as LoadedBoard,
  Me,
  Person,
  StickerPlacement,
  UserStats,
} from "@drawing-app/api/client";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { act, StrictMode, useEffect, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { boardSticker, gift, people, sticker, trailEntry } from "../api/testFixtures";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { ApiProvider } from "../api/ApiProvider";
import { SessionEnvelopeContext } from "../api/sessionContext";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import * as personSwitch from "../api/PersonSwitchProvider";
import { MeContext } from "../api/meContext";
import { TicketsProvider } from "../tickets/TicketsProvider";
import { toApiPlacement, toPerson, toRecordPlacement } from "../api/views";
import { forgetNoticedHere, markNoticed, noticeReceivesFromNow } from "../giving/noticedGifts";
import { forgetKeptGift, keepGift } from "../giving/keptGifts";
import type { GiftForYou } from "../receiving/GiftsForYouBadge";
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
import { inLanguage, onLargeScreen, renderInHost, stubResizeObservers } from "../ui/testing";
import { BoardPlacementSavesProvider, useBoardPlacementSaves } from "./BoardPlacementSavesProvider";
import type { BoardPlacementSaves } from "./boardPlacementSaves";
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

// happy-dom has no canvas context; the board's Zipper uses the recording stand-in.
vi.mock("../sticker-creation/canvas/context2d", async (importOriginal) => {
  const original = await importOriginal<typeof import("../sticker-creation/canvas/context2d")>();
  const { fakeContext2d } = await import("./timelapse/testCanvas");
  return { ...original, context2d: fakeContext2d };
});

// The board's chat menu and Privy reach LINE's SDK; nothing here needs it to answer.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
// The stat board mounts once the board is idle; its developer slip's LINE details read LIFF's context.
vi.mock("../line/LineDetails", () => ({ LineDetails: () => null }));
// Giving itself isn't tested here: it closes, sent or not, at a tap, from a board that can give.
vi.mock("../giving/useGiftSender", () => ({ useGiftSender: () => ({}) }));
vi.mock("../giving/Giving", () => ({
  Giving: ({
    onClose,
    forUserId,
    onSwitchRecipient,
  }: {
    onClose: (sent: boolean) => void;
    forUserId?: string;
    onSwitchRecipient?: (userId: string, giftId: string) => void;
  }) => (
    <>
      <button
        type="button"
        className="test-gift-sent"
        data-for-user-id={forUserId}
        onClick={() => onClose(true)}
      >
        Sent
      </button>
      <button type="button" className="test-gift-unsent" onClick={() => onClose(false)}>
        Not sent
      </button>
      {onSwitchRecipient && (
        <button
          className="test-gift-recipient"
          onClick={() => onSwitchRecipient("recipient", "gift-42")}
        >
          Recipient
        </button>
      )}
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
  sessionStorage.clear();
  forgetNoticedHere();
  readKeptBoardAgain();
  forgetBoardComplete();
  forgetGreetings();
});

const shownIds = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>(".placed-sticker")].map((el) => el.dataset.stickerId);
const keptPhone = () => {
  const spot = keptBoardFor(TEST_ME.id)?.stickers[0].placements.phone;
  if (!spot) throw new Error("No phone placement was kept");
  return spot;
};
const keptLarge = () => {
  const spot = keptBoardFor(TEST_ME.id)?.stickers[0].placements.large;
  if (!spot) throw new Error("No large placement was kept");
  return spot;
};
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

const settledStats: UserStats = {
  since: "2026-09-01T00:00:00.000Z",
  made: 0,
  received: 0,
  given: 0,
  gratitude: { direct: 0, residual: 0, total: 0 },
  bests: { bestCombo: 0, mostGratitudeInADay: 0, longestStreak: 0 },
  streak: 0,
};

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

  it("never draws a board kept for someone else, and forgets it", async () => {
    keep("someone-else", boardSticker({ placement: placedAt(0.3) }));
    const view = renderBoard(stillLoading());
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEPT_BOARD_KEY)).toBeNull();
    await act(async () => {});
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
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(651);
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

describe("StickerBoard's gifts for you", () => {
  const offline = () => new ApiError(0, { error: "network", detail: "Incoming gifts unavailable" });
  const incoming = (): GiftForYou => {
    const arriving = sticker();
    return {
      gift: gift({ stickerId: arriving.id, giverId: people.mika.id }),
      giver: people.mika,
      sticker: arriving,
    };
  };
  const giftAlert = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLElement>(".board-alerts .error-line")].find((line) =>
      line.textContent?.includes("Incoming gifts unavailable"),
    );

  it("keeps the failed incoming-gift alert and its details through another failed retry", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const giftsForYou = vi.fn<ApiClient["giftsForYou"]>().mockRejectedValue(offline());
    const stickerBoard = vi.fn<ApiClient["stickerBoard"]>().mockResolvedValue({
      owner: TEST_OWNER,
      boardStickers: [],
    });
    const tickets = vi.fn<ApiClient["tickets"]>().mockResolvedValue(FRESH_TICKETS);
    const view = await openBoard(boardApi([], { giftsForYou, stickerBoard, tickets }));
    const alert = giftAlert(view.host);
    expect(alert?.querySelector('[role="alert"]')?.textContent).toContain(NETWORK_ERROR);
    expect(alert?.textContent).toContain("Incoming gifts unavailable");
    expect(view.host.querySelector(".gifts-for-you-badge")).toBeNull();
    expect(log).toHaveBeenCalledWith("Loading gifts-for-you:0 failed", expect.any(ApiError));

    await act(async () => alert?.querySelector<HTMLElement>(".label-btn--quiet")?.click());
    expect(giftsForYou).toHaveBeenCalledTimes(2);
    expect(stickerBoard).toHaveBeenCalledTimes(1);
    expect(tickets).toHaveBeenCalledTimes(1);
    expect(giftAlert(view.host)?.querySelector('[role="alert"]')?.textContent).toContain(
      NETWORK_ERROR,
    );
    expect(view.host.querySelector(".gifts-for-you-badge")).toBeNull();
  });

  it("clears the failed alert after retry and refreshes gifts when Receiving closes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const waiting = incoming();
    const giftsForYou = vi
      .fn<ApiClient["giftsForYou"]>()
      .mockRejectedValueOnce(offline())
      .mockResolvedValueOnce({ gifts: [waiting] })
      .mockResolvedValueOnce({ gifts: [] });
    const onOpenGift = vi.fn();
    const view = await openBoard(boardApi([], { giftsForYou }), { onOpenGift });
    expect(giftAlert(view.host)).toBeDefined();

    await act(async () =>
      giftAlert(view.host)?.querySelector<HTMLElement>(".label-btn--quiet")?.click(),
    );
    expect(giftAlert(view.host)).toBeUndefined();
    const badge = view.host.querySelector<HTMLElement>(".gifts-for-you-badge");
    expect(badge).not.toBeNull();
    act(() => badge?.click());
    expect(onOpenGift).toHaveBeenCalledWith(waiting);

    view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={onOpenGift} giftClosures={1} />);
    await act(async () => {});
    expect(giftsForYou).toHaveBeenCalledTimes(3);
    expect(view.host.querySelector(".gifts-for-you-badge")).toBeNull();
  });

  it("translates a failed incoming-gift request when the app's language changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = await openBoard(boardApi([], { giftsForYou: () => Promise.reject(offline()) }));
    expect(giftAlert(view.host)?.textContent).toContain(
      stickerBoard.board.giftsDidntLoad.en.split(":")[0],
    );
    expect(giftAlert(view.host)?.textContent).toContain(withBreakHints(errors.network.en));

    await inLanguage("ja");
    expect(giftAlert(view.host)?.textContent).toContain(
      stickerBoard.board.giftsDidntLoad.ja.split("：")[0],
    );
    expect(giftAlert(view.host)?.textContent).toContain(withBreakHints(errors.network.ja));
    expect(giftAlert(view.host)?.textContent).toContain("Incoming gifts unavailable");
  });

  it("shows incoming-gift, ticket, and placement failures together", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(651);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tickets = vi.fn<ApiClient["tickets"]>().mockRejectedValue(offline());
    const giftsForYou = vi.fn<ApiClient["giftsForYou"]>().mockRejectedValue(offline());
    const view = await openBoard(
      boardApi([boardSticker({ placement: null })], {
        tickets,
        giftsForYou,
        saveStickerPlacement: () => Promise.reject(offline()),
      }),
    );
    const alerts = [...view.host.querySelectorAll('.board-alerts [role="alert"]')].map(
      (line) => line.textContent,
    );
    expect(alerts).toHaveLength(3);
    expect(
      alerts.some((line) => line?.includes(stickerBoard.board.giftsDidntLoad.en.split(":")[0])),
    ).toBe(true);
    expect(
      alerts.some((line) => line?.includes(stickerBoard.board.ticketsDidntLoad.en.split(":")[0])),
    ).toBe(true);
    expect(alerts.some((line) => line?.includes("Couldn’t save where"))).toBe(true);
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
    // Sharp image resizing is unrelated to the artist chip this test checks.
    stubResizeObservers();
    const finish: (() => void)[] = [];
    // Finish the landing inside act, where its callbacks can update the board.
    vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
      const animation = new Animation();
      Object.defineProperty(animation, "finished", {
        value: new Promise<void>((resolve) => finish.push(resolve)),
      });
      return animation;
    });
    const [a, b] = [
      byMika(),
      boardSticker({ placement: placedAt(0.7), sticker: sticker({ artist: people.ken }) }),
    ];
    // A received sticker has no spot until the board gives it one.
    const received = boardSticker({ placement: null, sticker: sticker({ artist: people.bob }) });
    keep(TEST_ME.id, a, b);

    const first = mounted(stillLoading());
    expect(chipped(first.host)).toEqual(["@ken", "@mika"]);
    await act(async () => {});
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
    await act(async () => finish.forEach((end) => end()));
    expect(landing()).toBeNull();
    expect(chipped(view.host)).toEqual(["@bob"]);
    await act(async () => {});
  });

  it("end with a turn of the board while they play, and don't start over when it turns back", async () => {
    keep(TEST_ME.id, byMika());
    const view = renderBoard(stillLoading({ userStats: () => Promise.resolve(settledStats) }));
    expect(chipped(view.host)).toEqual(["@mika"]);

    flip(view.host);
    flip(view.host);
    expect(chipped(view.host)).toEqual([]);
    await act(async () => {});
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
      openGift: { messageAttempt: null, id: "g-packed", status: "packed", for: null },
      sticker: sticker({ ownerId: TEST_OWNER.id }),
    });
    const viewed = boardSticker({
      placement: placedAt(0.5),
      sticker: sticker({ ownerId: TEST_OWNER.id }),
    });
    const after = boardSticker({
      placement: placedAt(0.8),
      sticker: sticker({ ownerId: TEST_OWNER.id }),
    });
    const listed = new Map([inTheBag, viewed, after].map((item) => [item.stickerId, item]));
    onAPhone();
    const view = await openBoard(
      boardApi([inTheBag, viewed, after], {
        userStats: () => Promise.resolve(settledStats),
        stickerDetail: async (id) => {
          const item = listed.get(id);
          if (!item) throw new Error(`Unexpected sticker detail ${id}`);
          return { sticker: item.sticker, owner: TEST_OWNER, transferTrail: [] };
        },
      }),
    );
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
    await act(async () => {});
  });
});

describe("StickerBoard after a gift", () => {
  it("shows a local LINE confirmation even when refreshing the board fails", async () => {
    const attemptId = `0x${"ab".repeat(32)}`;
    const giftId = "offline-confirmation";
    const outgoing = boardSticker({
      placement: placedAt(0.5),
      sticker: sticker({ ownerId: TEST_OWNER.id }),
      openGift: {
        id: giftId,
        status: "packed",
        for: null,
        messageAttempt: { id: attemptId, state: "pending" },
      },
    });
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce({ owner: TEST_OWNER, boardStickers: [outgoing] })
      .mockRejectedValue(
        new ApiError(0, { error: "network", detail: "Board refresh unavailable" }),
      );
    vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => forgetKeptGift(TEST_OWNER.id, giftId));
    const view = await openBoard(
      boardApi([outgoing], {
        stickerBoard,
        stickerDetail: async () => ({
          sticker: outgoing.sticker,
          owner: TEST_OWNER,
          transferTrail: [],
        }),
      }),
    );
    await act(() => vi.dynamicImportSettled());
    const slot = () =>
      view.host.querySelector<HTMLElement>(`.tray__slot[data-id="${outgoing.stickerId}"]`);
    expect(slot()?.dataset.state).toBe("sendNotConfirmed");
    act(() => slot()?.click());
    await act(() => vi.dynamicImportSettled());
    const note = () => document.querySelector(".sticker-detail__on-its-way")?.textContent;
    expect(note()).toContain("Send not confirmed");
    await act(async () => keepGift(TEST_OWNER.id, giftId, { message: "sent", attemptId }));
    await act(() => vi.dynamicImportSettled());
    await act(async () => {});
    expect(stickerBoard).toHaveBeenCalledTimes(2);
    expect(keptBoardFor(TEST_ME.id)?.stickers[0].openGift?.status).toBe("sent");
    expect(note()).toContain("Sent · Waiting to be received");
  });
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
    const gone = boardSticker({
      placement: placedAt(0.3),
      held: false,
      givenTo: { receiver: people.bob, receivedAt: RECEIVED_AT },
      sticker: sticker({ ownerId: people.bob.id }),
    });
    const kept = boardSticker({
      placement: placedAt(0.7),
      sticker: sticker({ ownerId: TEST_OWNER.id }),
    });
    const details = new Map([
      [gone.stickerId, { sticker: gone.sticker, owner: people.bob, transferTrail: [] }],
      [kept.stickerId, { sticker: kept.sticker, owner: TEST_OWNER, transferTrail: [] }],
    ]);
    // Noticed already, so no notice covers the board.
    markNoticed([{ stickerId: gone.stickerId, receivedAt: Date.parse(RECEIVED_AT) }]);
    const view = await openBoard(
      boardApi([gone, kept], {
        stickerDetail: async (id) => {
          const detail = details.get(id);
          if (!detail) throw new Error(`Unexpected sticker detail ${id}`);
          return detail;
        },
      }),
    );
    const stage = view.host.querySelector<HTMLElement>(".board-stage");
    if (!stage) throw new Error("The board has no stage");
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
    expect(detail?.querySelector(".sticker-detail__check-failed")).toBeNull();
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
  it("keeps a failure received while the board is absent and retries it on the next visit", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    let reject = (_: unknown) => {};
    const save = vi.fn(server.api.saveStickerPlacement).mockImplementationOnce(
      () =>
        new Promise((_, no) => {
          reject = no;
        }),
    );
    const view = await openBoard(emptyApi({ ...server.api, saveStickerPlacement: save }));
    await act(() => vi.dynamicImportSettled());
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    const moved = keptPhone();
    view.rerender(null);
    await act(async () => reject(new Error("offline")));
    view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />);
    await act(async () => {});
    expect(view.host.querySelector(".board-alerts")).not.toBeNull();
    await act(async () =>
      view.host.querySelector<HTMLButtonElement>(".board-alerts button")?.click(),
    );
    expect(view.host.querySelector(".board-alerts")).toBeNull();
    expect(server.onServer.get(a.stickerId)?.placement).toEqual(toApiPlacement(moved));
  });

  it("accepts another device's placement after a saved local move has been read back", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    const view = await openBoard(server.api);
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    await act(async () => myStickerBoardChanged());
    server.onServer.set(a.stickerId, { ...a, placement: placedAt(0.8) });
    await act(async () => myStickerBoardChanged());
    expect(keptPhone().x).toBe(0.8);
  });

  it("keeps uncommitted key steps over a read, then accepts an external placement after the steps settle", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    const view = await openBoard(server.api);
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    const transform = () =>
      view.host.querySelector<HTMLElement>(`[data-sticker-id="${a.stickerId}"]`)?.style.transform;
    const live = transform();
    server.onServer.set(a.stickerId, { ...a, placement: placedAt(0.8) });
    await act(async () => myStickerBoardChanged());
    expect(transform()).toBe(live);
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    expect(server.onServer.get(a.stickerId)?.placement?.x).toBeLessThan(0.5);
    await act(async () => myStickerBoardChanged());
    server.onServer.set(a.stickerId, { ...a, placement: placedAt(0.7) });
    await act(async () => myStickerBoardChanged());
    expect(keptPhone().x).toBe(0.7);
  });

  it("survives StrictMode effect cleanup while deriving and saving", async () => {
    onAnIpad();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    const view = renderInHost(
      <StrictMode>
        <MeContext value={TEST_ME}>
          <ApiProvider client={server.api}>
            <BoardPlacementSavesProvider>
              <TicketsProvider>
                <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />
              </TicketsProvider>
            </BoardPlacementSavesProvider>
          </ApiProvider>
        </MeContext>
      </StrictMode>,
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(server.saveLargeLayout).toHaveBeenCalledOnce();
    expect(server.onServer.get(a.stickerId)?.largePlacement).not.toBeNull();
  });

  it("abandons unsent placements when the account provider changes", async () => {
    let current!: BoardPlacementSaves;
    function Probe() {
      const { saves } = useBoardPlacementSaves();
      useEffect(() => {
        current = saves;
      }, [saves]);
      return null;
    }
    let release = () => {};
    const api = emptyApi();
    const save = vi.spyOn(api, "saveStickerPlacement").mockImplementationOnce(async (id, spots) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return emptyApi().saveStickerPlacement(id, spots);
    });
    const view = renderWithApi(<Probe />, api);
    unmount = view.unmount;
    const before = current;
    act(() => {
      before.save({ id: "a", no: 1 }, { phone: toRecordPlacement(placedAt(0.2)) });
      before.save({ id: "a", no: 1 }, { phone: toRecordPlacement(placedAt(0.3)) });
    });
    view.setMe({ ...TEST_ME, id: "other-account" });
    expect(current).not.toBe(before);
    expect(current.pendingSpots().size).toBe(0);
    await act(async () => release());
    expect(save).toHaveBeenCalledTimes(1);
    expect(current.read().unsaved.size).toBe(0);
  });

  it("serializes A, queued B, and remounted C across visits under one account", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    let release = () => {};
    let active = 0;
    let peak = 0;
    const sent: number[] = [];
    const api = emptyApi({
      ...server.api,
      saveStickerPlacement: async (id, spots) => {
        peak = Math.max(peak, ++active);
        sent.push(spots.placement?.x ?? -1);
        if (sent.length === 1)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        const saved = await server.api.saveStickerPlacement(id, spots);
        active--;
        return saved;
      },
    });
    const view = await openBoard(api);
    const press = selectByKeys(view.host, a.stickerId);
    for (let i = 0; i < 2; i++) {
      press("ArrowLeft");
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    }
    view.rerender(null);
    view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />);
    await act(async () => {});
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    const newest = keptPhone();
    await act(async () => release());
    expect(peak).toBe(1);
    expect(sent).toHaveLength(2);
    expect(server.onServer.get(a.stickerId)?.placement).toEqual(toApiPlacement(newest));
    expect(keptPhone()).toEqual(newest);
  });

  it.each(["before", "after"])(
    "keeps a pending move when a remount's stale read arrives %s its acknowledgement",
    async (order) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      onAPhone();
      const a = boardSticker({ placement: placedAt(0.5) });
      const server = boardServer(a);
      let releaseSave = () => {};
      let releaseRead = () => {};
      let reads = 0;
      const api = emptyApi({
        ...server.api,
        stickerBoard: () =>
          ++reads === 1
            ? server.api.stickerBoard()
            : new Promise((resolve) => {
                releaseRead = () => resolve({ owner: TEST_OWNER, boardStickers: [a] });
              }),
        saveStickerPlacement: async (id, spots) => {
          await new Promise<void>((resolve) => {
            releaseSave = resolve;
          });
          return server.api.saveStickerPlacement(id, spots);
        },
      });
      const view = await openBoard(api);
      selectByKeys(view.host, a.stickerId)("ArrowLeft");
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      const moved = keptPhone();
      view.rerender(null);
      view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />);
      await act(async () => {});
      if (order === "before") {
        await act(async () => releaseRead());
        await act(async () => releaseSave());
      } else {
        await act(async () => releaseSave());
        await act(async () => releaseRead());
      }
      expect(keptPhone()).toEqual(moved);
    },
  );

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

  it("passes the confirmed recipient and gift to the explicit person switch request", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const hook = vi
      .spyOn(personSwitch, "usePersonSwitch")
      .mockReturnValue({ pending: false, error: null, request });
    onTestFinished(() => hook.mockRestore());
    const a = boardSticker({ placement: placedAt(0.3) });
    const view = await openBoard(
      emptyApi({ stickerBoard: async () => ({ owner: TEST_OWNER, boardStickers: [a] }) }),
    );
    await openGiving(view.host, a.stickerId);
    const recipient = document.querySelector<HTMLButtonElement>(".test-gift-recipient");
    expect(recipient).not.toBeNull();
    await act(async () => recipient?.click());
    expect(request).toHaveBeenCalledExactlyOnceWith("recipient", {
      recipientUserId: "recipient",
      giftId: "gift-42",
    });
  });

  it("targets BIGWHEEL when Giving opens from Hana's own sticker board", async () => {
    const hana = {
      ...TEST_ME,
      id: "hana",
      handle: "hana",
      lineUserId: "dev-video-hana",
      lineDisplayName: "Hana",
    };
    const bigwheel = { ...TEST_ME, id: "bigwheel", handle: "BIGWHEEL" };
    const a = boardSticker({ sticker: sticker({ ownerId: hana.id }), placement: placedAt(0.3) });
    const api = emptyApi({ stickerBoard: async () => ({ owner: hana, boardStickers: [a] }) });
    const view = renderWithApi(
      <SessionEnvelopeContext
        value={sessionEnvelope(hana, {
          authenticated: bigwheel,
          allowedSelections: [bigwheel, hana],
          personSwitchMode: "live",
          selectionVersion: "selection",
        })}
      >
        <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />
      </SessionEnvelopeContext>,
      api,
      hana,
    );
    unmount = view.unmount;
    await act(async () => {});
    await act(async () => {});
    await openGiving(view.host, a.stickerId);
    expect(document.querySelector(".test-gift-sent")?.getAttribute("data-for-user-id")).toBe(
      bigwheel.id,
    );
  });

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
    const onItsWay = {
      ...a,
      openGift: { messageAttempt: null, id: "g1", status: "sent" as const, for: null },
    };
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
    await act(async () => {});
  });

  it("does not restore images or a forgotten cache when a pending placement settles after opting out and remounting", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAPhone();
    let releaseSave = () => {};
    let releaseRead = () => {};
    const api = emptyApi({
      stickerBoard: vi
        .fn<ApiClient["stickerBoard"]>()
        .mockResolvedValueOnce(boardFor(true))
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              releaseRead = () => resolve(boardFor(false));
            }),
        ),
      saveStickerPlacement: async (id, spots) => {
        await new Promise<void>((resolve) => {
          releaseSave = resolve;
        });
        return emptyApi().saveStickerPlacement(id, spots);
      },
    });
    const view = await openBoard(api, {}, { ...TEST_ME, nsfwOptIn: true });
    selectByKeys(view.host, "nsfw")("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    optOut(view);
    forgetKeptBoard();
    view.rerender(null);
    view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />);
    await act(async () => releaseSave());
    expect(view.host.innerHTML).not.toContain(DRAWING);
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
    await act(async () => releaseRead());
    expect(view.host.innerHTML).not.toContain(DRAWING);
    expect(view.host.innerHTML).toContain(VEILED);
    expect(JSON.stringify(keptBoardFor(TEST_ME.id))).not.toContain(DRAWING);
  });

  it("hides them in the board kept on this phone when the setting changed after it was kept", async () => {
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
    await act(async () => {});
  });

  it("shows no NSFW drawing in a received gift's notice from a board kept under the other setting", async () => {
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
    await act(async () => {});
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
  it("keeps the live key-step position when a derived acknowledgement arrives before the step is committed", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAnIpad();
    const a = boardSticker({ placement: placedAt(0.5) });
    const server = boardServer(a);
    let release = () => {};
    const api = emptyApi({
      ...server.api,
      saveLargeLayout: async (entries) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        server.onServer.set(a.stickerId, { ...a, largePlacement: placedAt(0.8) });
        return server.api.saveLargeLayout(entries);
      },
    });
    const view = await openBoard(api);
    selectByKeys(view.host, a.stickerId)("ArrowLeft");
    const shown = () =>
      view.host.querySelector<HTMLElement>(`[data-sticker-id="${a.stickerId}"]`)?.style.transform;
    const live = shown();
    await act(async () => release());
    expect(shown()).toBe(live);
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    expect(server.onServer.get(a.stickerId)?.largePlacement?.x).toBeLessThan(0.5);
  });

  it.each([false, true])(
    "settles a derived save across remount with a later manual edit: %s",
    async (edit) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      onAnIpad();
      const a = boardSticker({ placement: placedAt(0.5) });
      const server = boardServer(a);
      let release = () => {};
      const api = emptyApi({
        ...server.api,
        saveLargeLayout: async (entries) => {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          // Another device initialized the layout first; conditional initialization keeps its spot.
          server.onServer.set(a.stickerId, { ...a, largePlacement: placedAt(0.8) });
          return server.api.saveLargeLayout(entries);
        },
      });
      const view = await openBoard(api);
      view.rerender(null);
      view.rerender(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />);
      await act(async () => {});
      if (edit) {
        selectByKeys(view.host, a.stickerId)("ArrowLeft");
        act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
        expect(server.saveStickerPlacement).not.toHaveBeenCalled();
      }
      const expected = edit ? keptLarge().x : 0.8;
      await act(async () => release());
      expect(keptLarge().x).toBe(expected);
      expect(server.onServer.get(a.stickerId)?.largePlacement?.x).toBe(expected);
    },
  );

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

  it("draws a board kept on this device on a large screen only once it has a large layout", async () => {
    keep(TEST_ME.id, boardSticker({ placement: placedAt(0.3) }));
    onAnIpad();
    const view = renderBoard(stillLoading());
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
    await act(async () => {});
  });
});
