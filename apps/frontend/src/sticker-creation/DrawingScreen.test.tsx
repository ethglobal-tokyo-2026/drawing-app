// @vitest-environment happy-dom
import {
  KYOTO_SEIKA_TIME_USED_S,
  type KyotoSeikaSubject,
  type Me,
  type Tickets,
} from "@drawing-app/api/client";
import {
  act,
  createRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import { openedFrom } from "../app/openedView";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { useTickets } from "../tickets/useTickets";
import { personKey } from "../ui/deviceStorage";
import { onLargeScreen, onTouchScreen, SWITCH } from "../ui/testing";
import type { HistoryState, InputMode } from "./canvas/inkEngine";
import type { Op } from "./canvas/ops";
import { frameFor, SHEET_SHORT_UNITS } from "./canvas/sheetFrame";
import { DrawingScreen, type DrawingScreenHandle } from "./DrawingScreen";
import { keepDrawingHand, penDrew, readInputMode } from "./drawingSettings";
import { CHARRED_AT_ROLL } from "../kyoto-seika/dieMood";
import { REUNION, TEST_SUBJECTS, WIND } from "../kyoto-seika/testSubjects";
import {
  LOAD_TIMEOUT_MS,
  SessionKeeper,
  type KeptKyotoSeika,
  type KeptSession,
} from "./session/keptSession";
import { keepSentSeal, sealWentOut } from "./session/sentSeal";
import { sessionMs } from "./session/session";
import type { TimerDotHandle } from "./TimerDot";
import type { Panel } from "./tools/ToolStrip";

const kept = vi.hoisted(() => ({
  session: { status: "none" } as unknown,
}));
const sheetCalls = vi.hoisted(() => ({
  cleared: 0,
  settings: null as {
    paused: boolean;
    sessionMs: () => number;
    inputMode: InputMode | null;
  } | null,
  label: undefined as string | undefined,
  /** A touch met the sheet while it takes no ink. */
  blocked: () => {},
  /** A stroke landed on the sheet. */
  stroke: () => {},
}));
const subjectList = vi.hoisted(() => ({ load: vi.fn() }));
const sealing = vi.hoisted(() => ({ cut: vi.fn() }));
/** What the drawing screen asked the timer to say. */
const timerCalls = vi.hoisted(() => ({ hints: 0, clockRuns: 0 }));
/** The size rail's hold, as the drawing screen handed it over. */
const rail = vi.hoisted(() => ({ hold: (_held: boolean) => {} }));
/** The sheet every drawing here is on. */
const FRAME = frameFor({ width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 }, 1);

vi.mock("./canvas/DrawingCanvas", () => ({
  DrawingCanvas: forwardRef(function Sheet(
    {
      onHistory,
      onCommit,
      onBlocked,
      settings,
      label,
    }: {
      onHistory: (state: HistoryState) => void;
      onCommit: (op: Op) => void;
      onBlocked: () => void;
      settings: { paused: boolean; sessionMs: () => number; inputMode: InputMode | null };
      label?: string;
    },
    ref,
  ) {
    useEffect(() => {
      sheetCalls.settings = settings;
      sheetCalls.label = label;
      sheetCalls.blocked = onBlocked;
      sheetCalls.stroke = () => {
        onHistory({ canUndo: true, canRedo: false, hasInk: true });
        onCommit({ tool: "brush", color: "#1C1824", pts: [], T: 0 });
      };
    });
    useImperativeHandle(ref, () => ({
      undo() {},
      redo() {},
      // A clear leaves the drawing to undo, and no ink.
      clear() {
        sheetCalls.cleared++;
        onHistory({ canUndo: true, canRedo: false, hasInk: false });
      },
      reset() {},
      load(steps: readonly unknown[]) {
        const drawn = steps.length > 0;
        onHistory({ canUndo: drawn, canRedo: false, hasInk: drawn });
      },
      ops: () => [],
      steps: () => [],
      finishStroke() {},
      inkForReading: () => document.createElement("canvas"),
      frame: () => FRAME,
    }));
    return <div className="ink-sheet" />;
  }),
}));
vi.mock("./session/keptSession", async (original) => {
  const actual = await original<typeof import("./session/keptSession")>();
  return {
    ...actual,
    // A test's own session, or with none, what this device keeps.
    loadKeptSession: (userId: string) =>
      kept.session === null ? actual.loadKeptSession(userId) : Promise.resolve(kept.session),
  };
});
vi.mock("../kyoto-seika/subjectList", async (original) => ({
  ...(await original<object>()),
  loadSubjectList: subjectList.load,
}));
// Unless a test cuts one, the phone can't cut this sticker, however often it tries.
vi.mock("./sealing/makeSticker", () => ({ makeSticker: sealing.cut }));
beforeEach(() => {
  sealing.cut.mockRejectedValue(new Error("The sealing worker stopped"));
  // The drawing in progress is kept in IndexedDB, which happy-dom has none of.
  vi.stubGlobal("indexedDB", new FakeIndexedDB());
});
vi.mock("./TimerDot", () => ({
  TimerDot: ({ ref, onToggle }: { ref?: Ref<TimerDotHandle>; onToggle: () => void }) => {
    const button = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => ({
      showHint() {
        timerCalls.hints++;
      },
      showClockRuns() {
        timerCalls.clockRuns++;
      },
      focus() {
        button.current?.focus();
      },
    }));
    return <button ref={button} type="button" className="timer-stub" onClick={onToggle} />;
  },
}));
const privy = vi.hoisted(() => ({ retryPrivySignIn: vi.fn() }));
vi.mock("../identity/privy", () => privy);
vi.mock("../tickets/ReserveTicketCheckout", () => ({ ReserveTicketCheckout: () => null }));
vi.mock("./tools/ColorSheet", () => ({
  ColorSheet: ({ open }: { open: boolean }) => (open ? <div className="color-sheet" /> : null),
}));
vi.mock("./tools/SizeRail", () => ({
  SizeRail: ({ onHold }: { onHold: (held: boolean) => void }) => {
    useEffect(() => {
      rail.hold = onHold;
    });
    return null;
  },
}));
vi.mock("./tools/SmoothingBar", () => ({ SmoothingBar: () => null }));
// The tool strip's panel tiles, and the Pencil only tile once a pen has drawn here; the clear tile
// controls the clear bar as the real one does.
vi.mock("./tools/ToolStrip", () => ({
  ToolStrip: ({
    clearBarId,
    onPanel,
    inputMode,
    onInputMode,
  }: {
    clearBarId: string;
    onPanel: (panel: Exclude<Panel, null>) => void;
    inputMode: InputMode | null;
    onInputMode: (mode: InputMode) => void;
  }) => (
    <>
      <button type="button" className="color-tile" onClick={() => onPanel("color")} />
      <button type="button" className="smoothing-tile" onClick={() => onPanel("smoothing")} />
      <button
        type="button"
        className="clear-tile"
        aria-controls={clearBarId}
        onClick={() => onPanel("clear")}
      />
      {inputMode && (
        <button
          type="button"
          className="input-tile"
          aria-pressed={inputMode === "pencilOnly"}
          onClick={() => onInputMode(inputMode === "pencilOnly" ? "pencilAndFinger" : "pencilOnly")}
        />
      )}
    </>
  ),
}));

/** What Draw on the board means for the sheet, as the drawing screen last said. */
let sheet: unknown;
function SheetProbe() {
  const { sheet: said } = useTickets();
  useEffect(() => {
    sheet = said;
  });
  return null;
}

let view: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
  localStorage.clear();
  sheetCalls.cleared = 0;
  sheetCalls.settings = null;
  sheetCalls.label = undefined;
  timerCalls.hints = 0;
  timerCalls.clockRuns = 0;
  subjectList.load.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Lets the drawing screen's loads, frames and effects run. */
const settle = async (ms = 0) => {
  for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(ms / 5));
};

/** The drawing screen `reopen` rendered. */
const drawingScreen = createRef<DrawingScreenHandle>();

/** The drawing screen as App shows it: its My board tile puts the board over it. */
function DrawingAsApp({ ref }: { ref: Ref<DrawingScreenHandle> }) {
  const [active, setActive] = useState(true);
  return (
    <DrawingScreen
      ref={ref}
      active={active}
      onSealed={() => {}}
      onNewSticker={() => {}}
      onGoToBoard={() => {}}
      onMyBoardTile={() => setActive(false)}
    />
  );
}

/**
 * Opens the drawing screen after a reload that kept `session`, with these tickets from the server,
 * for `me`; `api` replaces any of the client's other methods.
 */
function reopen(
  session: KeptSession,
  tickets: Partial<Tickets> = {},
  me: Me = TEST_ME,
  api: Partial<ApiClient> = {},
) {
  vi.useFakeTimers();
  kept.session = session;
  view = renderWithApi(
    <>
      <DrawingAsApp ref={drawingScreen} />
      <SheetProbe />
    </>,
    emptyApi({ tickets: () => Promise.resolve({ ...FRESH_TICKETS, ...tickets }), ...api }),
    me,
  );
}

/** The server's answer to a daily ticket spent, in Kyoto Seika Practice Mode or not. */
const spentDaily = (kyotoSeikaPractice: boolean) =>
  ({
    ticketUse: {
      id: 9,
      ticketDay: FRESH_TICKETS.ticketDay,
      dayIndex: 0,
      kind: "daily",
      kyotoSeikaPractice,
      spentAt: "2026-09-26T00:00:00.000Z",
    },
    tickets: FRESH_TICKETS,
  }) as const;

/** A sticker the phone cuts from the sheet, so its seal goes out. */
const cutSticker = () => ({
  png: new Blob(["png"]),
  mask: new Blob(["mask"]),
  spec: new Blob(["spec"]),
  rim: new Blob(["rim"]),
  flat: new Blob(["flat"]),
  outline: "M0 0L1 1Z",
  width: 10,
  height: 10,
  pad: 0,
  inkWidth: 10,
  place: { x: 2, y: 3, w: 24, h: 18 },
  contour: [],
  layers: {},
  maskImage: document.createElement("canvas"),
  dispose: () => {},
});

const startOver = () =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === strings.stickerCreation.seal.startOver.en,
  );
/** A sticker in progress kept at 0:00, with nothing drawn that matters here. */
const keptAtTimeUp: KeptSession = {
  status: "found",
  ticket: 7,
  elapsedMs: sessionMs(false),
  nsfw: false,
  kyotoSeika: null,
  steps: [],
  frame: null,
};
const chip = () => document.querySelector(".seal-chip")?.textContent ?? "";
/** A tap on the seal check, for `countedAfter`, which runs it in act itself. */
const clickSealKey = () => document.querySelector<HTMLButtonElement>(".seal-key")?.click();
const tapSealKey = () => act(clickSealKey);
/** The seal sheet while it's up; a closed one slides away first, which happy-dom never finishes. */
const sealSheet = () => document.querySelector<HTMLElement>(".seal-sheet:not(.is-leaving)");
const nsfwSwitch = () => sealSheet()?.querySelector<HTMLInputElement>(SWITCH);
const sheetButton = (words: string) =>
  [...(sealSheet()?.querySelectorAll("button") ?? [])].find((b) => b.textContent === words);
const sealOnSheet = () =>
  act(() => sheetButton(strings.stickerCreation.sealSheet.seal.en)?.click());

describe("the drawing screen after a reload", () => {
  it("stops waiting on a sticker in progress whose seal went out once a read that never answers has had a second wait", async () => {
    keepSentSeal(TEST_ME.id, 7);
    reopen(
      {
        status: "unread",
        ticket: 7,
        kyotoSeika: null,
        error: new Error("slow"),
        later: new Promise(() => {}),
      },
      { usedToday: [] },
    );
    await settle();
    expect(sheet).toBeNull();

    await settle(LOAD_TIMEOUT_MS);
    expect(sealWentOut(TEST_ME.id, 7)).toBe(false);
    expect(sheet).toBe("fresh");
  });

  it("lets a sticker in progress the phone can't cut at 0:00 go for a fresh sheet", async () => {
    reopen(keptAtTimeUp);
    await settle();
    expect(sheet).toBe("held");

    // Back at 0:00, its time's-up sheet seals it, and the cut fails.
    sealOnSheet();
    await settle(1000);
    expect(sheet).toBe("held");
    const link = startOver();
    expect(link).toBeDefined();

    act(() => link?.click());
    await settle();
    expect(sheet).toBe("fresh");
    expect(startOver()).toBeUndefined();
  });

  it("offers no fresh sheet at 0:00 while the server may hold its seal", async () => {
    keepSentSeal(TEST_ME.id, 7);
    reopen(keptAtTimeUp);
    await settle();
    // Its seal went out before the reload, so it's back locked for the check, which cuts it again.
    act(() => document.querySelector<HTMLButtonElement>(".seal-key")?.click());
    await settle(1000);
    expect(chip()).toContain(strings.stickerCreation.seal.failed.onThisDevice.en);
    // The cut's own words show under the chip for a report, with Copy, as every error line does.
    expect(chip()).toContain(strings.ui.errorLine.details.en);
    expect(chip()).toContain("The sealing worker stopped");
    expect(startOver()).toBeUndefined();
    expect(sheet).toBe("held");
  });
});

/** Halfway through its time. */
const KEPT_MS = sessionMs(false) / 2;
/** A sticker in progress kept halfway through its time, with one stroke on it. */
const keptHalfway: KeptSession = {
  status: "found",
  ticket: 7,
  elapsedMs: KEPT_MS,
  nsfw: false,
  kyotoSeika: null,
  steps: [{ tool: "brush", color: "#1C1824", pts: [], T: 0 }],
  frame: FRAME,
};
const buttonSaying = (words: string) =>
  [...document.querySelectorAll("button")].find((button) => button.textContent === words);
/** The record of the session in progress, as this device keeps it. */
function keptRecord() {
  const raw: unknown = JSON.parse(
    localStorage.getItem(personKey("draw.session", TEST_ME.id)) ?? "null",
  );
  return typeof raw === "object" && raw !== null && "ticket" in raw && "elapsedMs" in raw
    ? raw
    : null;
}

/** How much the sheet's clock counts in the second after `action`. */
async function countedAfter(action: () => void) {
  const drawn = () => sheetCalls.settings?.sessionMs() ?? 0;
  act(action);
  const before = drawn();
  await settle(1000);
  return drawn() - before;
}
const tapTimer = () => document.querySelector<HTMLButtonElement>(".timer-stub")?.click();
const tapMyBoardTile = () =>
  document
    .querySelector<HTMLButtonElement>(`button[aria-label="${strings.stickerCreation.myBoard.en}"]`)
    ?.click();
const openPanel = (panel: Exclude<Panel, null>) => () =>
  document.querySelector<HTMLButtonElement>(`.${panel}-tile`)?.click();
/** Each tool in hand: the color sheet, the Smoothing bar, the clear bar and a finger on the size rail. */
const TOOLS_IN_HAND = [
  openPanel("color"),
  openPanel("smoothing"),
  openPanel("clear"),
  () => rail.hold(true),
];
const putToolsDown = () => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  rail.hold(false);
};

describe("the seal sheet", () => {
  const { sealSheet: words } = strings.stickerCreation;
  /** A drawing kept a moment before 0:00, so a test can let its clock run out. */
  const keptNearTimeUp = { ...keptHalfway, elapsedMs: sessionMs(false) - 2000 };

  /** Opens `session`, a drawing in progress the phone cuts, whose seal never answers. */
  async function openDrawing(session: KeptSession = keptHalfway) {
    sealing.cut.mockResolvedValue(cutSticker());
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    reopen(session, {}, TEST_ME, { seal, spendTicket: () => Promise.resolve(spentDaily(false)) });
    await settle();
    return seal;
  }

  it.each([false, true])(
    "opens at one tap on the check, and seals 18+ only with the switch on: on %s",
    async (on) => {
      const seal = await openDrawing();
      expect(document.querySelector(".seal-key")?.getAttribute("aria-haspopup")).toBe("dialog");
      tapSealKey();
      expect(sealSheet()).not.toBeNull();
      expect(nsfwSwitch()?.checked).toBe(false);
      await settle(1000);
      expect(seal).not.toHaveBeenCalled();

      if (on) act(() => nsfwSwitch()?.click());
      sealOnSheet();
      await settle(1000);
      expect(seal).toHaveBeenCalledOnce();
      expect(seal.mock.calls[0]?.[0].nsfw).toBe(on);
      // Its drawn size is where it was cut on the sheet, in units, whatever its image's size.
      expect(seal.mock.calls[0]?.[0]).toMatchObject({
        drawnWidth: 24 / FRAME.density,
        drawnHeight: 18 / FRAME.density,
      });
    },
  );

  it("keeps the drawing when LINE's sign-in has expired, and the check reconnects LINE back to it", async () => {
    sealing.cut.mockResolvedValue(cutSticker());
    vi.spyOn(console, "error").mockImplementation(() => {});
    // What the wait for the Sui address answers once Privy needs LINE reconnected.
    const seal = vi.fn<ApiClient["seal"]>(() =>
      Promise.reject(new ApiError(0, { error: "line_token_expired" })),
    );
    reopen(keptHalfway, {}, TEST_ME, { seal });
    await settle();
    tapSealKey();
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(chip()).toContain(strings.stickerCreation.seal.failed.signInExpired.en);
    expect(sheet).toBe("held");
    expect(keptRecord()).toMatchObject({ ticket: 7 });

    await settle(1000);
    expect(chip()).toContain(strings.stickerCreation.seal.failed.signInExpired.en);
    tapSealKey();
    expect(privy.retryPrivySignIn).toHaveBeenCalledExactlyOnceWith(
      new URL("/draw", location.href).href,
      expect.any(Function),
    );
    expect(keptRecord()).toMatchObject({ ticket: 7 });
  });

  it("closes at Not yet with the drawing and the 18+ choice kept, on the phone too", async () => {
    const seal = await openDrawing();
    tapSealKey();
    act(() => nsfwSwitch()?.click());
    act(() => sheetButton(words.notYet.en)?.click());
    expect(sealSheet()).toBeNull();
    expect(keptRecord()).toMatchObject({ ticket: 7, nsfw: true });

    tapSealKey();
    expect(nsfwSwitch()?.checked).toBe(true);
    expect(seal).not.toHaveBeenCalled();
  });

  it("comes back on for a kept drawing marked 18+, and starts off on a new sheet", async () => {
    await openDrawing({ ...keptHalfway, nsfw: true });
    tapSealKey();
    expect(nsfwSwitch()?.checked).toBe(true);
    act(() => sheetButton(words.notYet.en)?.click());

    act(() => drawingScreen.current?.startNewSticker());
    await settle();
    act(() => sheetCalls.stroke());
    tapSealKey();
    expect(nsfwSwitch()?.checked).toBe(false);
  });

  it("holds a regular sheet's clock while it's open", async () => {
    await openDrawing();
    // A reload brings the drawing back paused; a tap on the timer runs it again.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(await countedAfter(clickSealKey)).toBe(0);
    expect(await countedAfter(() => sheetButton(words.notYet.en)?.click())).toBeGreaterThan(0);
  });

  it("rises in its time's-up state at 0:00, without Not yet, and seals nothing by itself", async () => {
    const seal = await openDrawing(keptNearTimeUp);
    act(tapTimer);
    await settle(3000);
    expect(sealSheet()?.querySelector("h2")?.textContent).toBe(words.timeUp.en);
    expect(sheetButton(words.notYet.en)).toBeUndefined();
    // Escape, like Back and the perforation, can't put the pencils back in hand.
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await settle(10_000);
    expect(sealSheet()?.textContent).toContain(words.timeUp.en);
    // Its perforation is plain holes, not a control.
    expect(sealSheet()?.querySelector(".perf")?.matches("button")).toBe(false);
    expect(seal).not.toHaveBeenCalled();

    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
  });

  it("comes back in its time's-up state after a reload at 0:00", async () => {
    await openDrawing({ ...keptHalfway, elapsedMs: sessionMs(false) });
    expect(sealSheet()?.textContent).toContain(words.timeUp.en);
    expect(sheetButton(words.notYet.en)).toBeUndefined();
  });
});

describe("the drawing screen's clock", () => {
  it("holds while a tool is in hand, and pauses at a tap on the timer", async () => {
    reopen(keptHalfway);
    await settle();
    // A reload brings the drawing back paused; a tap on the timer runs it again.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    for (const takeTool of TOOLS_IN_HAND) {
      expect(await countedAfter(takeTool)).toBe(0);
      expect(await countedAfter(putToolsDown)).toBeGreaterThan(0);
    }
    expect(await countedAfter(tapTimer)).toBe(0);
  });

  it("holds while the board covers the screen, which its My board tile opens", async () => {
    reopen(keptHalfway);
    await settle();
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(await countedAfter(tapMyBoardTile)).toBe(0);
  });

  it("holds while the phone is on its side, under the upright cover, and runs again upright", async () => {
    const phone = onTouchScreen({ landscape: false, large: false });
    reopen(keptHalfway);
    await settle();
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(await countedAfter(() => phone.landscape.change(true))).toBe(0);
    expect(await countedAfter(() => phone.landscape.change(false))).toBeGreaterThan(0);
  });
});

describe("clearing the sheet", () => {
  it("keeps the sticker's ticket and its time, and leaves focus on Undo, the way back", async () => {
    reopen(keptHalfway);
    await settle();
    act(() => document.querySelector<HTMLButtonElement>(".clear-tile")?.click());
    // Focus starts on Cancel, so Enter alone never clears.
    expect(document.activeElement?.textContent).toBe(strings.stickerCreation.clearBar.cancel.en);

    act(() => buttonSaying(strings.stickerCreation.clearBar.clear.en)?.click());
    await settle();
    expect(sheetCalls.cleared).toBe(1);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      strings.stickerCreation.history.undo.en,
    );
    // A reset would have wiped what's kept and asked for a fresh sheet.
    expect(sheet).toBe("held");
    expect(keptRecord()).toMatchObject({ ticket: 7 });
    expect(keptRecord()?.elapsedMs).toBeGreaterThanOrEqual(KEPT_MS);
  });

  it("clears nothing on Cancel, and gives focus back to the tile", async () => {
    reopen(keptHalfway);
    await settle();
    const tile = document.querySelector<HTMLButtonElement>(".clear-tile");
    act(() => tile?.click());
    act(() => buttonSaying(strings.stickerCreation.clearBar.cancel.en)?.click());
    expect(document.querySelector(".clear-bar.is-open")).toBeNull();
    expect(sheetCalls.cleared).toBe(0);
    expect(document.activeElement).toBe(tile);
  });
});

describe("a sheet in Kyoto Seika Manga Expression Practice Mode", () => {
  const KYOTO_SEIKA_ME: Me = { ...TEST_ME, kyotoSeikaPractice: true };

  // The kept session's IndexedDB connections last the page's life, so a test that reads back what
  // this device keeps draws as someone new.
  let people = 0;
  const someoneNew = (): Me => ({ ...KYOTO_SEIKA_ME, id: `kyoto-seika-${++people}` });

  /**
   * Opens a fresh sheet whose daily ticket is spent in the mode, once the subject list `load`s; with
   * `session` null, the sheet this device keeps.
   */
  async function openKyotoSeikaSheet(
    session: KeptSession | null = { status: "none" },
    api: Partial<ApiClient> = {},
    me: Me = KYOTO_SEIKA_ME,
  ) {
    vi.useFakeTimers();
    kept.session = session;
    view = renderWithApi(
      <DrawingScreen
        active
        onSealed={() => {}}
        onNewSticker={() => {}}
        onGoToBoard={() => {}}
        onMyBoardTile={() => {}}
      />,
      emptyApi({ spendTicket: () => Promise.resolve(spentDaily(true)), ...api }),
      me,
    );
    await settle();
  }
  const dice = () => [...document.querySelectorAll<HTMLButtonElement>(".subject-reroll")];
  /** The dealt subjects, each a toggle that picks it. */
  const subjects = () => [
    ...document.querySelectorAll<HTMLButtonElement>(".kyoto-seika-deal button[aria-pressed]"),
  ];
  /** The test list's subject a toggle is named by: its word, then any English. */
  const subjectOf = (toggle: HTMLButtonElement | undefined) => {
    const name = toggle?.getAttribute("aria-label") ?? toggle?.textContent ?? "";
    return TEST_SUBJECTS.find(
      (s) => name === s.ja || (name.startsWith(s.ja) && /^[,、]/.test(name.slice(s.ja.length))),
    );
  };
  /** Taps the subjects at `places`, in turn. */
  const tapSubjects = (...places: number[]) => {
    for (const place of places) act(() => subjects()[place]?.click());
  };
  const beginKey = () => document.querySelector<HTMLButtonElement>(".begin-key button");
  /** The sheet still waits for Begin: it takes no ink and its tools are put away. */
  const stillDealt = () =>
    sheetCalls.settings?.paused === true &&
    document.querySelector(".drawing-screen")?.classList.contains("is-dealt") === true;
  const loads = () => subjectList.load.mockResolvedValue({ subjects: TEST_SUBJECTS, notices: "" });
  /** Begin's name, which says the clock it starts: the mode's. */
  const BEGIN_LABEL = strings.kyotoSeika.begin.label.en.replace(
    "{{minutes}}",
    String(KYOTO_SEIKA_TIME_USED_S / 60),
  );
  const pick = ({ ja, reading, en }: KyotoSeikaSubject) => ({ ja, reading, en });
  /** A sheet begun on 風 and 再会. */
  const BEGUN: KeptKyotoSeika = {
    subjects: [WIND, REUNION],
    picked: [0, 1],
    rolls: 0,
    begun: true,
  };
  const pressed = () => subjects().map((toggle) => toggle.getAttribute("aria-pressed"));

  it("deals five subjects for a ticket spent in Kyoto Seika Practice Mode, hides the tools and holds the sheet until Begin has two picked", async () => {
    loads();
    await openKyotoSeikaSheet();
    expect(subjects()).toHaveLength(5);
    expect(dice()).toHaveLength(1);
    expect(stillDealt()).toBe(true);
    tapSubjects(2);
    act(() => beginKey()?.click());
    await settle(1000);
    expect(stillDealt()).toBe(true);

    tapSubjects(4);
    const first = subjectOf(subjects()[2]);
    act(() => beginKey()?.click());
    await settle(1000);
    expect(sheetCalls.settings?.paused).toBe(false);
    expect(keptRecord()).toMatchObject({ kyotoSeika: { picked: [0, 1], begun: true } });
    expect(sheetCalls.label).toContain(first?.ja);
  });

  it("brings a reload back to the same subjects and picks, its charred die still charred", async () => {
    loads();
    const five = TEST_SUBJECTS.filter((s, i, all) => all.findIndex((o) => o.kind === s.kind) === i);
    await openKyotoSeikaSheet({
      status: "found",
      ticket: 9,
      elapsedMs: 0,
      nsfw: false,
      kyotoSeika: { subjects: five, picked: [3], rolls: CHARRED_AT_ROLL, begun: false },
      steps: [],
      frame: null,
    });
    expect(dice()[0].getAttribute("aria-disabled")).toBe("true");
    expect(subjects().map(subjectOf)).toEqual(five);
    expect(pressed()).toEqual(["false", "false", "false", "true", "false"]);
  });

  it("deals the rest of the kinds round a pair kept by a build that dealt two, the pair already picked", async () => {
    loads();
    const me = someoneNew();
    vi.useFakeTimers();
    new SessionKeeper(me.id).save([], 0, FRAME);
    await settle(1000);
    localStorage.setItem(
      personKey("draw.session", me.id),
      JSON.stringify({
        ticket: 9,
        elapsedMs: 0,
        nsfw: false,
        kyotoSeika: { subjects: [WIND, REUNION], rolls: [3, 0], begun: false },
      }),
    );
    await openKyotoSeikaSheet(null, {}, me);
    await settle(1000);
    expect(subjects()).toHaveLength(5);
    expect(new Set(subjects().map((toggle) => subjectOf(toggle)?.kind)).size).toBe(5);
    expect(subjects().slice(0, 2).map(subjectOf)).toEqual([WIND, REUNION]);
    expect(pressed()).toEqual(["true", "true", "false", "false", "false"]);
    act(() => beginKey()?.click());
    await settle(1000);
    expect(stillDealt()).toBe(false);
  });

  it("shows why the subjects didn't load, and tries again on a fresh page, which picks the sheet up and deals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const navigate = vi.spyOn(location, "replace").mockImplementation(() => {});
    onTestFinished(() => navigate.mockRestore());
    subjectList.load.mockRejectedValueOnce(new Error("The chunk didn't load"));
    loads();
    const me = someoneNew();
    await openKyotoSeikaSheet(undefined, {}, me);
    expect(dice()).toHaveLength(0);
    act(() => beginKey()?.click());
    await settle();
    expect(stillDealt()).toBe(true);
    act(() => buttonSaying(strings.ui.errorLine.tryAgain.en)?.click());
    // A browser keeps a failed module fetch for the page's life, so the list loads only on a fresh page.
    expect(subjectList.load).toHaveBeenCalledOnce();
    const to = navigate.mock.calls[0]?.[0];
    expect(to && openedFrom(new URL(to).pathname).view).toBe("draw");

    // The fresh page reads the sheet this one kept on the device, once its writes land.
    await settle(1000);
    view?.unmount();
    await openKyotoSeikaSheet(null, {}, me);
    await settle(1000);
    expect(subjects()).toHaveLength(5);
  });

  it("hands focus to the clock Begin started, since Begin leaves with the deal", async () => {
    loads();
    await openKyotoSeikaSheet();
    tapSubjects(0, 1);
    beginKey()?.focus();
    act(() => beginKey()?.click());
    await settle(1000);
    expect(document.activeElement?.className).toBe("timer-stub");
  });

  it("lets the deal go for good once begun, though the board covers the screen as it leaves", async () => {
    loads();
    await openKyotoSeikaSheet();
    tapSubjects(0, 1);
    act(() => beginKey()?.click());
    const screen = (active: boolean) => (
      <DrawingScreen
        active={active}
        onSealed={() => {}}
        onNewSticker={() => {}}
        onGoToBoard={() => {}}
        onMyBoardTile={() => {}}
      />
    );
    view?.rerender(screen(false));
    await settle(1000);
    view?.rerender(screen(true));
    expect(document.querySelector(".kyoto-seika-deal")).toBeNull();
    expect(beginKey()).toBeNull();
  });

  it("brings the timer's word on what starts it at a touch on the sheet before Begin", async () => {
    loads();
    await openKyotoSeikaSheet();
    act(() => sheetCalls.blocked());
    expect(timerCalls.hints).toBe(1);
  });

  it("won't begin while the subjects load, since the sheet couldn't seal without its pair", async () => {
    let deliver = (_list: unknown) => {};
    subjectList.load.mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    await openKyotoSeikaSheet();
    act(() => beginKey()?.click());
    await settle(1000);
    expect(stillDealt()).toBe(true);

    await act(async () => deliver({ subjects: TEST_SUBJECTS, notices: "" }));
    tapSubjects(0, 1);
    act(() => beginKey()?.click());
    await settle(1000);
    expect(stillDealt()).toBe(false);
    expect(keptRecord()).toMatchObject({ kyotoSeika: { begun: true } });
  });

  it("seals a begun sheet with its pair, each subject as the sticker keeps it", async () => {
    sealing.cut.mockResolvedValue(cutSticker());
    vi.spyOn(console, "error").mockImplementation(() => {});
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    // Begun and kept at 0:00, it's back pencils down, and its time's-up sheet seals it.
    const atTimeUp = sessionMs(true);
    await openKyotoSeikaSheet(
      { ...keptAtTimeUp, ticket: 9, elapsedMs: atTimeUp, kyotoSeika: BEGUN },
      { seal },
    );
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(seal.mock.calls[0]?.[0].kyotoSeikaSubjects).toEqual([pick(WIND), pick(REUNION)]);
  });

  it("puts a drawing whose pair a later build can't read back at its deal, on its 30-minute clock, and seals it with the pair picked from the deal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sealing.cut.mockResolvedValue(cutSticker());
    loads();
    const me = someoneNew();
    // Halfway through a begun sheet, kept by a build whose subjects this one can't read.
    vi.useFakeTimers();
    const halfway = sessionMs(true) / 2;
    new SessionKeeper(me.id).save(
      [{ tool: "brush", color: "#1C1824", pts: [], T: 0 }],
      halfway,
      FRAME,
    );
    await settle(1000);
    const pair = [{ word: WIND.ja }, { word: REUNION.ja }];
    localStorage.setItem(
      personKey("draw.session", me.id),
      JSON.stringify({
        ticket: 9,
        elapsedMs: halfway,
        nsfw: false,
        kyotoSeika: { subjects: pair, rolls: [0, 0], begun: true },
      }),
    );
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    await openKyotoSeikaSheet(null, { seal }, me);
    await settle(1000);
    expect(stillDealt()).toBe(true);
    expect(subjects()).toHaveLength(5);

    // Picked in this order, the pair seals in it.
    tapSubjects(3, 1);
    const picked = [subjectOf(subjects()[3]), subjectOf(subjects()[1])];
    expect(beginKey()?.getAttribute("aria-label")).toBe(BEGIN_LABEL);
    act(() => beginKey()?.click());
    await settle(1000);
    tapSealKey();
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(seal.mock.calls[0]?.[0].kyotoSeikaSubjects).toEqual(picked.map((s) => s && pick(s)));
  });

  it("runs a begun sheet's clock on, as the real test's: no tool in hand holds it, and a tap on the timer only says why", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    // A reload's pause still lets go at a tap.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    for (const takeTool of TOOLS_IN_HAND) expect(await countedAfter(takeTool)).toBeGreaterThan(0);
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(timerCalls.clockRuns).toBe(1);
  });

  it("holds a begun sheet's clock while the phone is on its side, as it does under the board", async () => {
    const phone = onTouchScreen({ landscape: false, large: false });
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    // A reload's pause lets go at a tap.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(await countedAfter(() => phone.landscape.change(true))).toBe(0);
    expect(await countedAfter(() => phone.landscape.change(false))).toBeGreaterThan(0);
  });

  it("runs on under the open seal sheet, as the real test's clock does, and calls pencils down in place at 0:00", async () => {
    const { notYet, pencilsDown } = strings.stickerCreation.sealSheet;
    sealing.cut.mockResolvedValue(cutSticker());
    await openKyotoSeikaSheet({
      ...keptHalfway,
      ticket: 9,
      elapsedMs: sessionMs(true) - 3000,
      kyotoSeika: BEGUN,
    });
    // A reload's pause lets go at a tap.
    act(tapTimer);
    expect(await countedAfter(clickSealKey)).toBeGreaterThan(0);
    const notYetLink = sheetButton(notYet.en);
    act(() => notYetLink?.focus());
    await settle(3000);
    expect(sealSheet()?.querySelector("h2")?.textContent).toBe(pencilsDown.en);
    expect(sealSheet()?.querySelector("[role='status']")?.textContent).toBe(pencilsDown.en);
    // Not yet's slot stays, out of reach, so the sheet keeps its height; focus goes to the switch,
    // never to Seal, so Enter can't seal blind.
    expect(notYetLink?.closest("[inert]")).not.toBeNull();
    expect(document.activeElement).toBe(nsfwSwitch());
  });

  it("shows a begun sheet's pair on its seal sheet, whose sticker wears the Kyoto Seika foil, and pink once marked 18+", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    tapSealKey();
    const pair = sealSheet()?.querySelector(".subject-pair")?.textContent;
    expect(pair).toContain(WIND.ja);
    expect(pair).toContain(REUNION.ja);
    const foil = () => sealSheet()?.querySelector(".seal-preview .sticker-foil")?.classList;
    expect(foil()).toContain("sticker-foil--kyoto-seika");
    act(() => nsfwSwitch()?.click());
    expect(foil()).toContain("sticker-foil--pink");
  });

  it("names a begun canvas by its pair: each word with its English in English, the words alone in Japanese", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    for (const { ja, en } of [WIND, REUNION]) {
      expect(sheetCalls.label).toContain(ja);
      expect(sheetCalls.label).toContain(en);
    }
    await act(() => i18next.changeLanguage("ja"));
    try {
      for (const { ja, en } of [WIND, REUNION]) {
        expect(sheetCalls.label).toContain(ja);
        expect(sheetCalls.label).not.toContain(en);
      }
    } finally {
      await act(() => i18next.changeLanguage("en"));
    }
  });

  it("names Begin by what it does once two subjects are picked", async () => {
    loads();
    await openKyotoSeikaSheet();
    tapSubjects(0, 1);
    expect(beginKey()?.getAttribute("aria-label")).toBe(BEGIN_LABEL);
  });
});

describe("the color sheet", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Opens the color sheet over a drawing picked up after a reload. */
  const openColors = async () => {
    reopen(keptHalfway);
    await settle();
    act(openPanel("color"));
  };
  const colorSheet = () => document.querySelector(".color-sheet");
  /** A finger landing on what `selector` finds. */
  const touch = (selector: string) =>
    act(
      () =>
        void document
          .querySelector(selector)
          ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
    );

  it("closes at a tap outside on a large screen, where it's a popover, and not at a tap on it", async () => {
    onLargeScreen();
    await openColors();
    touch(".color-sheet");
    expect(colorSheet()).not.toBeNull();
    touch(".timer-stub");
    expect(colorSheet()).toBeNull();
  });

  it("stays at a tap outside on a phone, where it's a bottom sheet", async () => {
    await openColors();
    touch(".timer-stub");
    expect(colorSheet()).not.toBeNull();
  });
});

describe("the input mode", () => {
  const inputTile = () => document.querySelector<HTMLButtonElement>(".input-tile");

  it("starts each sheet in Settings' default once a pen has drawn here, and the tile switches this sheet alone", async () => {
    reopen(keptHalfway, {}, TEST_ME, { spendTicket: () => Promise.resolve(spentDaily(false)) });
    await settle();
    expect(inputTile()).toBeNull();
    expect(sheetCalls.settings?.inputMode).toBeNull();

    act(() => penDrew());
    expect(inputTile()?.getAttribute("aria-pressed")).toBe("true");
    expect(sheetCalls.settings?.inputMode).toBe("pencilOnly");

    act(() => inputTile()?.click());
    expect(sheetCalls.settings?.inputMode).toBe("pencilAndFinger");
    expect(readInputMode()).toBe("pencilOnly");

    act(() => drawingScreen.current?.startNewSticker());
    await settle();
    expect(sheetCalls.settings?.inputMode).toBe("pencilOnly");
  });
});

describe("the drawing hand", () => {
  it("mirrors the drawing screen at once when Left is chosen, with no reload", async () => {
    reopen(keptHalfway);
    await settle();
    const hand = () => document.querySelector(".drawing-screen")?.getAttribute("data-hand");
    expect(hand()).toBe("right");
    act(() => void keepDrawingHand("left"));
    expect(hand()).toBe("left");
  });
});
