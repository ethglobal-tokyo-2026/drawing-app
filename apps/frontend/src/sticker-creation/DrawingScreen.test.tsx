// @vitest-environment happy-dom
import {
  KYOTO_SEIKA_TIME_USED_S,
  MAX_LAYERS,
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
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import { ApiError, type ApiClient } from "../api/apiClient";
import { sticker as aSticker } from "../api/testFixtures";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import { openedFrom } from "../app/openedView";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { keptSpend } from "../tickets/spendKey";
import { useTickets } from "../tickets/useTickets";
import { personKey } from "../ui/deviceStorage";
import { onLargeScreen, onTouchScreen, SWITCH } from "../ui/testing";
import type { FillWorkState, HistoryState, InputMode } from "./canvas/inkEngine";
import type { SmoothingMode } from "./canvas/stabilizer";
import { CanvasUnavailableError } from "./canvas/canvasUnavailable";
import { FillError } from "./canvas/fill-worker/errors";
import { StabilizationError } from "./canvas/stabilizer";
import type { Op, Step } from "./canvas/ops";
import { frameFor, SHEET_SHORT_UNITS } from "./canvas/sheetFrame";
import { DrawingScreen, type DrawingScreenHandle } from "./DrawingScreen";
import type { SealedSticker } from "./sealing/makeSticker";
import { keepDrawingHand, penDrew, readInputMode } from "./drawingSettings";
import { FIRST_LAYER, FIRST_LAYERS } from "./layers/layerState";
import type { LayerView } from "./layers/layerView";
import { CHARRED_AT_ROLL } from "../kyoto-seika/dieMood";
import { REUNION, TEST_SUBJECTS, WIND } from "../kyoto-seika/testSubjects";
import {
  LOAD_TIMEOUT_MS,
  SessionKeeper,
  loadKeptSession,
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
  selected: [] as number[],
  moved: [] as { id: number; to: number }[],
  merged: 0,
  mergeFails: false,
  opacities: [] as number[],
  layers: (_view: LayerView) => {},
  view: null as LayerView | null,
  loadedCurrent: null as number | null,
  steps: [] as Step[],
  inkFailed: (_error: unknown) => {},
  /** Every composite of the sheet read, in order; each is let go of by setting its size to 0. */
  composites: [] as HTMLCanvasElement[],
  compositeError: null as Error | null,
  /** The pointers swallowed, so they draw nothing on the sheet. */
  swallowed: [] as number[],
  /** A stroke is being drawn: the sheet's finishInk lands it. */
  live: false,
  finish: vi.fn(() => Promise.resolve()),
  finalRead: vi.fn(),
  color: (_hex: string) => {},
  abort: vi.fn(),
  closeInput: vi.fn(),
  fillState: (_state: FillWorkState) => {},
  history: (_state: HistoryState) => {},
  settings: null as {
    fillReference: "layer" | "visible";
    color: string;
    tool: "brush" | "eraser" | "fill";
    paused: boolean;
    locked: boolean;
    panelOpen: boolean;
    sessionMs: () => number;
    inputMode: InputMode | null;
    smoothingMode: SmoothingMode;
  } | null,
  label: undefined as string | undefined,
  /** A touch met the sheet while it takes no ink. */
  blocked: () => {},
  /** A stroke landed on the sheet. */
  stroke: () => {},
}));
const subjectList = vi.hoisted(() => ({ load: vi.fn() }));
const sealing = vi.hoisted(() => ({ cut: vi.fn() }));
const preview = vi.hoisted(() => ({ prepare: vi.fn((): "ready" | "empty" => "ready") }));
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
      onLayers,
      onInkFailed,
      onFillState,
      active,
    }: {
      active: boolean;
      onFillState: (state: FillWorkState) => void;
      onHistory: (state: HistoryState) => void;
      onCommit: (op: Op) => void;
      onBlocked: () => void;
      settings: {
        fillReference: "layer" | "visible";
        color: string;
        tool: "brush" | "eraser" | "fill";
        paused: boolean;
        locked: boolean;
        panelOpen: boolean;
        sessionMs: () => number;
        inputMode: InputMode | null;
        smoothingMode: SmoothingMode;
      };
      label?: string;
      onLayers?: (view: LayerView) => void;
      onInkFailed?: (error: unknown) => void;
    },
    ref,
  ) {
    useEffect(() => {
      sheetCalls.fillState = (state) => onFillState?.(state);
      sheetCalls.history = onHistory;
      sheetCalls.settings = settings;
      sheetCalls.label = label;
      sheetCalls.layers = (view) => onLayers?.(view);
      sheetCalls.inkFailed = (error) => onInkFailed?.(error);
      if (sheetCalls.view) onLayers?.(sheetCalls.view);
      sheetCalls.blocked = onBlocked;
      sheetCalls.stroke = () => {
        onHistory({ canUndo: true, canRedo: false, hasInk: true });
        onLayers?.({
          state: FIRST_LAYERS,
          current: FIRST_LAYER,
          inked: new Set([FIRST_LAYER]),
          currentInked: true,
          versions: new Map(),
        });
        onCommit({ tool: "brush", layer: 1, color: "#1C1824", pts: [], T: 0 });
      };
    });
    useLayoutEffect(() => {
      if (!active) sheetCalls.abort("sheet hidden");
    }, [active]);
    const paper = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
      undo() {},
      redo() {},
      // A clear leaves the drawing to undo, and no ink.
      clearLayer() {
        sheetCalls.cleared++;
        onHistory({ canUndo: true, canRedo: false, hasInk: false });
      },
      addLayer() {
        sheetCalls.steps.push({ tool: "add", layer: 2, at: 1, T: 0 });
        onHistory({ canUndo: true, canRedo: false, hasInk: false });
      },
      selectLayer(id: number) {
        sheetCalls.selected.push(id);
      },
      deleteLayer() {},
      mergeDown() {
        sheetCalls.merged++;
        if (sheetCalls.mergeFails) return;
        onLayers?.({
          state: FIRST_LAYERS,
          current: 1,
          inked: new Set([1]),
          currentInked: true,
          versions: new Map(),
        });
      },
      moveLayer(id: number, to: number) {
        sheetCalls.moved.push({ id, to });
      },
      previewOpacity() {},
      setOpacity(value: number) {
        sheetCalls.opacities.push(value);
      },
      setLocked() {},
      setClipped() {},
      thumbnail: () => null,
      reset() {},
      load(steps: readonly unknown[], _frame: unknown, current: number) {
        sheetCalls.loadedCurrent = current;
        const drawn = steps.length > 0;
        onHistory({ canUndo: drawn, canRedo: false, hasInk: drawn });
        onLayers?.(
          sheetCalls.view ?? {
            state: FIRST_LAYERS,
            current,
            inked: new Set(drawn ? [FIRST_LAYER] : []),
            currentInked: drawn && current === FIRST_LAYER,
            versions: new Map(),
          },
        );
      },
      timelapse: () => {
        sheetCalls.finalRead("timelapse");
        return { steps: sheetCalls.steps, start: FIRST_LAYERS };
      },
      steps: () => {
        sheetCalls.finalRead("steps");
        return sheetCalls.steps;
      },
      finishInk() {
        if (sheetCalls.live) {
          sheetCalls.live = false;
          sheetCalls.stroke();
        }
        return sheetCalls.finish();
      },
      abortPendingFill: sheetCalls.abort,
      closeInput: sheetCalls.closeInput,
      composite() {
        sheetCalls.finalRead("composite");
        if (sheetCalls.compositeError) throw sheetCalls.compositeError;
        const canvas = document.createElement("canvas");
        [canvas.width, canvas.height] = [FRAME.w, FRAME.h];
        sheetCalls.composites.push(canvas);
        return canvas;
      },
      frame: () => {
        sheetCalls.finalRead("frame");
        return FRAME;
      },
      sheetRect: () => paper.current?.getBoundingClientRect() ?? null,
      swallow(pointerId: number) {
        sheetCalls.swallowed.push(pointerId);
      },
    }));
    return <div ref={paper} className="ink-sheet" />;
  }),
}));
vi.mock("./layers/layerThumbnails", () => ({ drawThumbnail: () => {} }));
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
vi.mock("./sealing/sealPreview", () => ({ prepareSealPreview: preview.prepare }));
beforeEach(() => {
  sealing.cut.mockRejectedValue(new Error("The sealing worker stopped"));
  preview.prepare.mockReset().mockReturnValue("ready");
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
  ColorSheet: ({ open, onPick }: { open: boolean; onPick: (hex: string) => void }) => {
    sheetCalls.color = onPick;
    return open ? <div className="color-sheet" /> : null;
  },
}));
vi.mock("./tools/SizeRail", () => ({
  SizeRail: ({ onHold }: { onHold: (held: boolean) => void }) => {
    useEffect(() => {
      rail.hold = onHold;
    });
    return null;
  },
}));
// The tool strip's panel tiles, and the Pencil only tile once a pen has drawn here; the clear tile
// controls the clear bar as the real one does.
vi.mock("./tools/ToolStrip", () => ({
  ToolStrip: ({
    tool,
    clearBarId,
    canClear,
    onTool,
    onPanel,
    inputMode,
    onInputMode,
  }: {
    tool: "brush" | "eraser" | "fill";
    clearBarId: string;
    canClear: boolean;
    onTool: (tool: "brush" | "eraser" | "fill") => void;
    onPanel: (panel: Exclude<Panel, null>) => void;
    inputMode: InputMode | null;
    onInputMode: (mode: InputMode) => void;
  }) => (
    <>
      <button type="button" aria-pressed={tool === "brush"} onClick={() => onTool("brush")}>
        Brush
      </button>
      <button type="button" aria-pressed={tool === "fill"} onClick={() => onTool("fill")}>
        Fill
      </button>
      <button type="button" className="color-tile" onClick={() => onPanel("color")} />
      <button type="button" className="smoothing-tile" onClick={() => onPanel("smoothing")} />
      <button
        type="button"
        className="clear-tile"
        aria-controls={clearBarId}
        disabled={!canClear}
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
  sheetCalls.selected = [];
  sheetCalls.moved = [];
  sheetCalls.merged = 0;
  sheetCalls.mergeFails = false;
  sheetCalls.opacities = [];
  sheetCalls.view = null;
  sheetCalls.loadedCurrent = null;
  sheetCalls.steps = [];
  sheetCalls.composites = [];
  sheetCalls.compositeError = null;
  sheetCalls.swallowed = [];
  sheetCalls.live = false;
  sheetCalls.finish.mockReset().mockResolvedValue();
  sheetCalls.finalRead.mockReset();
  sheetCalls.abort.mockReset();
  sheetCalls.closeInput.mockReset();
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

/** The drawing screen each test renders. */
const drawingScreen = createRef<DrawingScreenHandle>();

/** The drawing screen as App shows it, `active` until the board covers it, as its My board tile does. */
function DrawingAsApp({ active }: { active: boolean }) {
  const [covered, setCovered] = useState(false);
  return (
    <DrawingScreen
      ref={drawingScreen}
      active={active && !covered}
      onSealed={() => {}}
      onNewSticker={() => {}}
      onGoToBoard={() => {}}
      onMyBoardTile={() => setCovered(true)}
    />
  );
}

/** The drawing screen, `active` or under the board, and what Draw on the board means for its sheet. */
const screenAsApp = (active = true) => (
  <>
    <DrawingAsApp active={active} />
    <SheetProbe />
  </>
);

/** Opens the drawing screen on `client` for `me`, after a reload that kept `session`; null: what this device keeps. */
function openScreen(session: KeptSession | null, client: ApiClient, me: Me) {
  vi.useFakeTimers();
  kept.session = session;
  view = renderWithApi(screenAsApp(), client, me);
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
  const answers = () => Promise.resolve({ ...FRESH_TICKETS, ...tickets });
  openScreen(session, emptyApi({ tickets: answers, ...api }), me);
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
const cutSticker = (): SealedSticker => {
  const pass = { width: 1, height: 1, close() {} };
  return {
    png: new Blob(["png"]),
    sharp: null,
    mask: new Blob(["mask"]),
    flat: new Blob(["flat"]),
    outline: "M0 0L1 1Z",
    width: 10,
    height: 10,
    pad: 0,
    inkWidth: 10,
    place: { x: 2, y: 3, w: 24, h: 18 },
    contour: [],
    passes: { plain: pass, gloss: pass, shadow: pass },
    maskUrl: "blob:mask",
    maskImage: document.createElement("canvas"),
    dispose: () => {},
  };
};

const startOver = () =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === strings.stickerCreation.seal.startOver.en,
  );
/** A sticker in progress kept at 0:00, with nothing drawn that matters here. */
const keptAtTimeUp: KeptSession = {
  status: "found",
  generation: "saved-generation",
  ticket: 7,
  elapsedMs: sessionMs(false),
  nsfw: false,
  currentLayer: FIRST_LAYER,
  kyotoSeika: null,
  steps: [],
  frame: null,
};
const chip = () => document.querySelector(".seal-chip")?.textContent ?? "";
/** A tap on the seal check, for `countedAfter`, which runs it in act itself. */
const clickSealKey = () => document.querySelector<HTMLButtonElement>(".seal-key")?.click();
const tapSealKey = async () => {
  act(clickSealKey);
  await settle();
};
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
    const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(spentDaily(false)));
    reopen(
      {
        status: "unread",
        ticket: 7,
        kyotoSeika: null,
        error: new Error("slow"),
        later: new Promise(() => {}),
      },
      { usedToday: [] },
      TEST_ME,
      { spendTicket },
    );
    await settle();
    expect(sheet).toBeNull();

    await settle(LOAD_TIMEOUT_MS);
    expect(sealWentOut(TEST_ME.id, 7)).toBe(false);
    expect(spendTicket).toHaveBeenCalledOnce();
    expect(keptRecord()).toMatchObject({ ticket: 9 });
    expect(sheet).toBe("held");
  });

  it("lets a sticker in progress the phone can't cut at 0:00 go for a fresh sheet", async () => {
    const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(spentDaily(false)));
    reopen(keptAtTimeUp, {}, TEST_ME, { spendTicket });
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
    expect(spendTicket).toHaveBeenCalledOnce();
    expect(keptRecord()).toMatchObject({ ticket: 9 });
    expect(sheet).toBe("held");
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

  it("keeps an expired drawing when its seal composite cannot allocate a canvas", async () => {
    const failure = vi.spyOn(console, "error").mockImplementation(() => {});
    const wipe = vi.spyOn(SessionKeeper.prototype, "wipe");
    onTestFinished(() => {
      wipe.mockRestore();
      failure.mockRestore();
    });
    reopen(keptAtTimeUp);
    await settle();
    sheetCalls.steps = keptAtTimeUp.steps.slice();
    expect(sheetButton(strings.stickerCreation.sealSheet.seal.en)?.disabled).toBe(false);
    sheetCalls.compositeError = new CanvasUnavailableError();
    sealOnSheet();
    await settle(1000);

    expect(sheet).toBe("held");
    expect(wipe).not.toHaveBeenCalled();
    expect(keptRecord()).toMatchObject({ ticket: 7 });
    expect(chip()).toContain(strings.stickerCreation.seal.failed.onThisDevice.en);
    expect(chip()).not.toContain(strings.stickerCreation.seal.emptyAtTimeUp.en);
    expect(failure).toHaveBeenCalled();
  });

  it("keeps a stabilization failure visible without calling it a memory failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => error.mockRestore());
    reopen(keptAtTimeUp);
    await settle();
    const failure = new StabilizationError("Release limit exceeded");
    act(() => sheetCalls.inkFailed(failure));
    await settle(1000);
    expect(chip()).toContain(strings.stickerCreation.layers.stabilizationFailed.en);
    expect(chip()).not.toContain(strings.stickerCreation.layers.inkFailed.en);
    expect(error).toHaveBeenCalledWith("The drawing could not be updated", failure);
  });

  it("doesn't show an earlier seal failure's detail under a later ink failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    reopen(keptAtTimeUp);
    await settle();
    sealOnSheet();
    await settle(1000);
    expect(chip()).toContain("The sealing worker stopped");

    act(() => sheetCalls.inkFailed(new Error("out of memory")));
    expect(chip()).toContain(strings.stickerCreation.layers.inkFailed.en);
    expect(chip()).not.toContain("The sealing worker stopped");
    error.mockRestore();
  });
});

/** Halfway through its time. */
const KEPT_MS = sessionMs(false) / 2;
/** A sticker in progress kept halfway through its time, with one stroke on it. */
const keptHalfway: Extract<KeptSession, { status: "found" }> = {
  status: "found",
  generation: "saved-generation",
  ticket: 7,
  elapsedMs: KEPT_MS,
  nsfw: false,
  currentLayer: FIRST_LAYER,
  kyotoSeika: null,
  steps: [{ tool: "brush", layer: 1, color: "#1C1824", pts: [], T: 0 }],
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

  it("keeps expired invisible ink until Start a new sticker after reload", async () => {
    preview.prepare.mockReturnValue("empty");
    const expired = { ...keptHalfway, elapsedMs: sessionMs(false) };
    const me: Me = { ...TEST_ME, id: "empty-preview-retained-session" };
    vi.useFakeTimers();
    const keeper = new SessionKeeper(me.id);
    keeper.start(expired.ticket, expired.kyotoSeika);
    keeper.save(expired.steps, expired.elapsedMs, expired.frame);
    await settle(1000);
    kept.session = null;
    const readKept = async () => {
      const loading = loadKeptSession(me.id);
      await settle(1000);
      return loading;
    };
    expect(await readKept()).toMatchObject({ status: "found", steps: expired.steps });
    sheetCalls.steps = expired.steps.slice();
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    openScreen(null, emptyApi({ seal, spendTicket: () => Promise.resolve(spentDaily(false)) }), me);
    await settle();
    expect(await readKept()).toMatchObject({
      status: "found",
      ticket: 7,
      elapsedMs: sessionMs(false),
      steps: expired.steps,
    });
    expect(seal).not.toHaveBeenCalled();
    act(() => startOver()?.click());
    await settle();
    expect(await readKept()).not.toMatchObject({
      status: "found",
      ticket: 7,
      elapsedMs: sessionMs(false),
    });
    expect(sealSheet()).toBeNull();
  });

  it("persistent time-up preview failure offers explicit discard without resetting", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    preview.prepare.mockImplementation(() => {
      throw new Error("read failed");
    });
    await openDrawing({ ...keptHalfway, elapsedMs: sessionMs(false) });
    expect(keptRecord()).toMatchObject({ ticket: 7 });
    expect(sheetButton(words.retryPreview.en)).toBeDefined();
    expect(startOver()).toBeDefined();
  });

  it("empty preview holds the ordinary clock and Back to drawing resumes it", async () => {
    preview.prepare.mockReturnValue("empty");
    await openDrawing();
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(await countedAfter(clickSealKey)).toBe(0);
    expect(await countedAfter(() => sheetButton(words.backToDrawing.en)?.click())).toBeGreaterThan(
      0,
    );
  });

  it.each([false, true])(
    "opens at one tap on the check, and seals 18+ only with the switch on: on %s",
    async (on) => {
      const seal = await openDrawing();
      expect(document.querySelector(".seal-key")?.getAttribute("aria-haspopup")).toBe("dialog");
      await tapSealKey();
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
    await tapSealKey();
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(chip()).toContain(strings.stickerCreation.seal.failed.signInExpired.en);
    expect(sheet).toBe("held");
    expect(keptRecord()).toMatchObject({ ticket: 7 });

    await settle(1000);
    expect(chip()).toContain(strings.stickerCreation.seal.failed.signInExpired.en);
    await tapSealKey();
    expect(privy.retryPrivySignIn).toHaveBeenCalledExactlyOnceWith(
      new URL("/draw", location.href).href,
      expect.any(Function),
    );
    expect(keptRecord()).toMatchObject({ ticket: 7 });
  });

  it("sends the same seal again at the check after the server fails it, and seals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sealing.cut.mockClear();
    sealing.cut.mockResolvedValue(cutSticker());
    const sealed = aSticker();
    const seal = vi
      .fn<ApiClient["seal"]>()
      .mockRejectedValueOnce(new ApiError(503, { error: "mint_failed" }))
      .mockResolvedValueOnce({
        sticker: sealed,
        stickerPlacement: {
          stickerId: sealed.id,
          placement: null,
          largePlacement: null,
          seenAt: null,
          arrivedAt: sealed.sealedAt,
        },
      });
    reopen(keptHalfway, {}, TEST_ME, { seal });
    await settle();
    await tapSealKey();
    sealOnSheet();
    await settle(1000);
    expect(chip()).toContain(strings.stickerCreation.seal.failed.notOnChain.en);
    // The server may hold the seal, so a reload still knows it went out.
    expect(sealWentOut(TEST_ME.id, 7)).toBe(true);

    await tapSealKey();
    await settle(1000);
    // The retry sends the request it held rather than cutting the sheet again.
    expect(sealing.cut).toHaveBeenCalledOnce();
    expect(seal).toHaveBeenCalledTimes(2);
    expect(seal.mock.calls[1]?.[0]).toBe(seal.mock.calls[0]?.[0]);
    expect(sealWentOut(TEST_ME.id, 7)).toBe(false);
    expect(sheet).toBe("fresh");
  });

  it("closes at Not yet with the drawing and the 18+ choice kept, on the phone too", async () => {
    const seal = await openDrawing();
    await tapSealKey();
    act(() => nsfwSwitch()?.click());
    act(() => sheetButton(words.notYet.en)?.click());
    expect(sealSheet()).toBeNull();
    expect(keptRecord()).toMatchObject({ ticket: 7, nsfw: true });

    await tapSealKey();
    expect(nsfwSwitch()?.checked).toBe(true);
    expect(seal).not.toHaveBeenCalled();
  });

  it("cuts the sticker from one composite of the sheet, and lets it go", async () => {
    const seal = await openDrawing();
    await tapSealKey();
    // The preview reads one of its own as the seal sheet opens.
    sheetCalls.composites = [];
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(sheetCalls.composites.map(({ width }) => width)).toEqual([0]);
  });

  it("comes back on for a kept drawing marked 18+, and starts off on a new sheet", async () => {
    await openDrawing({ ...keptHalfway, nsfw: true });
    await tapSealKey();
    expect(nsfwSwitch()?.checked).toBe(true);
    act(() => sheetButton(words.notYet.en)?.click());

    act(() => drawingScreen.current?.startNewSticker());
    await settle();
    act(() => sheetCalls.stroke());
    await tapSealKey();
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

  it("ends the stroke being drawn at 0:00 and keeps it, even when it's the only ink on the sheet", async () => {
    // Cleared, then drawing again as the clock runs out.
    await openDrawing({ ...keptNearTimeUp, steps: [] });
    act(tapTimer);
    sheetCalls.live = true;
    await settle(3000);
    expect(sheetCalls.live).toBe(false);
    expect(sealSheet()?.querySelector("h2")?.textContent).toBe(words.timeUp.en);
  });
});

describe("the drawing screen's clock", () => {
  it("uses fixed pen speed for a session saved before speed choices existed", async () => {
    reopen({
      ...keptHalfway,
      tools: { fillReference: "layer", brushSize: 0.34, eraserSize: 0.52, smoothing: 20 },
    });
    await settle();
    expect(sheetCalls.settings?.smoothingMode).toBe("fixed");
  });
  it("restores and saves pen speed choices through the real smoothing panel", async () => {
    reopen({
      ...keptHalfway,
      tools: {
        fillReference: "layer",
        brushSize: 0.34,
        eraserSize: 0.52,
        smoothing: 20,
        smoothingMode: "fast",
      },
    });
    await settle();
    act(openPanel("smoothing"));
    const select = document.querySelector<HTMLSelectElement>(".smoothing-bar select");
    expect(select).not.toBeNull();
    expect(select?.value).toBe("fast");
    expect(sheetCalls.settings?.smoothingMode).toBe("fast");
    act(() => {
      if (!select) return;
      select.value = "slow";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(sheetCalls.settings?.smoothingMode).toBe("slow");
    expect(keptRecord()).toMatchObject({ tools: { smoothingMode: "slow" } });
  });
  it("keeps Fill reference visible while drawing, remembers the selected source, and leaves the clock running", async () => {
    reopen(keptHalfway);
    await settle();
    expect(document.querySelector('[role="radiogroup"][aria-label="Fill reference"]')).toBeNull();
    act(() => buttonSaying("Fill")?.click());
    const choices = document.querySelector('[role="radiogroup"][aria-label="Fill reference"]');
    expect(choices).not.toBeNull();
    expect(sheetCalls.settings?.fillReference).toBe("layer");
    expect(choices?.querySelector<HTMLInputElement>('input[value="layer"]')?.checked).toBe(true);
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    const visible = choices?.querySelector<HTMLInputElement>('input[value="visible"]');
    expect(visible).not.toBeNull();
    expect(await countedAfter(() => visible?.click())).toBeGreaterThan(0);
    expect(sheetCalls.settings?.fillReference).toBe("visible");
    expect(keptRecord()).toMatchObject({ tools: { fillReference: "visible" } });
    act(() => buttonSaying("Brush")?.click());
    await settle();
    expect(document.querySelector('[role="radiogroup"][aria-label="Fill reference"]')).toBeNull();
    act(() => buttonSaying("Fill")?.click());
    expect(document.querySelector<HTMLInputElement>('input[value="visible"]')?.checked).toBe(true);
    expect(sheetCalls.settings?.panelOpen).toBe(false);
  });

  it("restores a remembered Fill reference and hides its choices behind a panel or the board", async () => {
    reopen({
      ...keptHalfway,
      tools: { fillReference: "visible", brushSize: 0.34, eraserSize: 0.52, smoothing: 0 },
    });
    await settle();
    act(() => buttonSaying("Fill")?.click());
    expect(sheetCalls.settings?.fillReference).toBe("visible");
    expect(document.querySelector<HTMLInputElement>('input[value="visible"]')?.checked).toBe(true);
    act(openPanel("color"));
    await settle();
    expect(document.querySelector('[role="radiogroup"][aria-label="Fill reference"]')).toBeNull();
    act(putToolsDown);
    await settle();
    expect(
      document.querySelector('[role="radiogroup"][aria-label="Fill reference"]'),
    ).not.toBeNull();
    view?.rerender(screenAsApp(false));
    expect(document.querySelector('[role="radiogroup"][aria-label="Fill reference"]')).toBeNull();
  });

  it("starts a fresh sticker with this layer after a kept sticker used visible reference", async () => {
    reopen({
      ...keptHalfway,
      tools: { fillReference: "visible", brushSize: 0.34, eraserSize: 0.52, smoothing: 0 },
    });
    await settle();
    expect(sheetCalls.settings?.fillReference).toBe("visible");
    act(() => drawingScreen.current?.startNewSticker());
    expect(sheetCalls.settings?.fillReference).toBe("layer");
  });

  it("holds while a tool is in hand, and pauses at a tap on the timer", async () => {
    reopen(keptHalfway);
    await settle();
    // A reload brings the drawing back paused; a tap on the timer runs it again.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    for (const [index, takeTool] of TOOLS_IN_HAND.entries()) {
      expect(await countedAfter(takeTool)).toBe(0);
      expect(sheetCalls.settings?.panelOpen).toBe(index < 3);
      expect(await countedAfter(putToolsDown)).toBeGreaterThan(0);
      expect(sheetCalls.settings?.panelOpen).toBe(false);
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

describe("the drawing screen's layers", () => {
  const twoLayers: LayerView = {
    state: {
      layers: [FIRST_LAYERS.layers[0], { id: 2, opacity: 100, locked: false, clipped: false }],
      nextId: 3,
    },
    current: 1,
    inked: new Set([1]),
    currentInked: true,
    versions: new Map(),
  };
  const show = (next: LayerView) => act(() => sheetCalls.layers(next));

  it("keeps a layer added before the first mark without starting the clock", async () => {
    const save = vi.spyOn(SessionKeeper.prototype, "save");
    reopen({ ...keptAtTimeUp, elapsedMs: 0 });
    await settle();
    act(() => document.querySelector<HTMLButtonElement>(".layer-add")?.click());
    expect(save).toHaveBeenCalledWith([{ tool: "add", layer: 2, at: 1, T: 0 }], 0, FRAME);
    expect(await countedAfter(tapTimer)).toBe(0);
    save.mockRestore();
  });

  it("restores metadata-only layer history with the clock waiting for the first mark", async () => {
    reopen({
      ...keptAtTimeUp,
      elapsedMs: 0,
      steps: [
        { tool: "add", layer: 2, at: 1, T: 0 },
        { tool: "opacity", layer: 2, opacity: 50, T: 0 },
        { tool: "lock", layer: 2, on: true, T: 0 },
        { tool: "clip", layer: 2, on: true, T: 0 },
        { tool: "move", layer: 2, to: 0, T: 0 },
      ],
    });
    await settle();
    expect(await countedAfter(tapTimer)).toBe(0);
    expect(await countedAfter(() => sheetCalls.stroke())).toBeGreaterThan(0);
  });

  it("selects another layer, opens options on the current chip, and closes them on the sheet", async () => {
    reopen(keptHalfway);
    await settle();
    show(twoLayers);
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="2"]')?.click());
    expect(sheetCalls.selected).toEqual([2]);
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    expect(document.querySelector(".layer-options-bar")).not.toBeNull();
    act(
      () =>
        void document
          .querySelector(".ink-sheet")
          ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 19 })),
    );
    expect(document.querySelector(".layer-options-bar")).toBeNull();
    expect(sheetCalls.swallowed).toContain(19);
  });

  it("disables delete on the last layer and add at the layer limit", async () => {
    reopen(keptHalfway);
    await settle();
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    expect(
      document
        .querySelector<HTMLButtonElement>('[aria-label="Delete layer"]')
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
    show({
      ...twoLayers,
      state: {
        layers: Array.from({ length: MAX_LAYERS }, (_, i) => ({
          ...FIRST_LAYERS.layers[0],
          id: i + 1,
        })),
        nextId: MAX_LAYERS + 1,
      },
    });
    expect(document.querySelector<HTMLButtonElement>(".layer-add")?.disabled).toBe(true);
  });

  it("opens opacity in settings for either one or multiple layers", async () => {
    reopen(keptHalfway);
    await settle();
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    expect(document.querySelector(".opacity-slider")).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector(".opacity-slider"));
    show(twoLayers);
    show({
      ...twoLayers,
      state: { ...FIRST_LAYERS, layers: [{ ...FIRST_LAYERS.layers[0], opacity: 50 }] },
    });
    expect(document.querySelector(".opacity-slider")).not.toBeNull();
  });

  it("only enables Clear while the current layer has ink", async () => {
    reopen(keptHalfway);
    await settle();
    show({ ...twoLayers, current: 2, currentInked: false });
    expect(document.querySelector<HTMLButtonElement>(".clear-tile")?.disabled).toBe(true);
  });

  it("merges into the destination and returns focus to its selected chip", async () => {
    reopen(keptHalfway);
    await settle();
    show({ ...twoLayers, current: 2 });
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="2"]')?.click());
    act(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="Merge down into layer 1"]')?.click(),
    );
    expect(sheetCalls.merged).toBe(1);
    const destination = document.querySelector('[data-layer-chip="1"]');
    expect(destination?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(destination);
  });

  it("keeps the source settings and focused Merge control when the engine cannot merge", async () => {
    reopen(keptHalfway);
    await settle();
    show({ ...twoLayers, current: 2 });
    sheetCalls.mergeFails = true;
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="2"]')?.click());
    const merge = document.querySelector<HTMLButtonElement>(
      '[aria-label="Merge down into layer 1"]',
    );
    if (!merge) throw new Error("Merge should be available before allocation fails");
    act(() => {
      merge.focus();
      merge.click();
    });
    expect(sheetCalls.merged).toBe(1);
    expect(document.querySelector('[data-layer-chip="2"]')?.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(document.querySelector('[data-layer-chip="1"]')?.getAttribute("aria-selected")).toBe(
      "false",
    );
    expect(document.querySelector(".layer-options-bar")).not.toBeNull();
    expect(document.activeElement).toBe(merge);
  });

  it("offers direct settings and full-opacity recovery for a hidden current layer", async () => {
    reopen(keptHalfway);
    await settle();
    show({
      ...twoLayers,
      state: { ...FIRST_LAYERS, layers: [{ ...FIRST_LAYERS.layers[0], opacity: 0 }] },
    });
    expect(document.querySelector(".layer-hidden-recovery")?.textContent).toContain("0% opacity");
    act(() => buttonSaying("Show at 100%")?.click());
    expect(sheetCalls.opacities).toEqual([100]);
    act(() => buttonSaying("Layer settings")?.click());
    expect(document.activeElement).toBe(document.querySelector(".opacity-slider"));
  });

  it("moves the current layer forward and announces where it went", async () => {
    reopen(keptHalfway);
    await settle();
    show(twoLayers);
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    act(() => document.querySelector<HTMLButtonElement>('[aria-label="Move forward"]')?.click());
    expect(sheetCalls.moved).toEqual([{ id: 1, to: 1 }]);
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(
      "Layer 1 moved in front of layer 2",
    );
  });

  it("holds a regular sheet's clock while the opacity thumb is held", async () => {
    reopen(keptHalfway);
    await settle();
    show(twoLayers);
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    const thumb = document.querySelector(".opacity-slider");
    expect(thumb).not.toBeNull();
    const point = (type: string) =>
      thumb?.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 21,
          clientX: 8,
          clientY: 100,
          bubbles: true,
        }),
      );
    expect(
      await countedAfter(() => {
        point("pointerdown");
      }),
    ).toBe(0);
    expect(
      await countedAfter(() => {
        point("pointerup");
        document.querySelector<HTMLButtonElement>('[aria-label="Close layer options"]')?.click();
      }),
    ).toBeGreaterThan(0);
  });

  it("passes the kept current layer to the sheet and keeps a later selection", async () => {
    reopen({ ...keptHalfway, currentLayer: 2 });
    await settle();
    expect(sheetCalls.loadedCurrent).toBe(2);
    show({ ...twoLayers, current: 2, currentInked: false });
    expect(keptRecord()).toMatchObject({ currentLayer: 2 });
  });

  it("keeps the layer the sheet actually selected when a kept layer no longer exists", async () => {
    sheetCalls.view = {
      state: FIRST_LAYERS,
      current: FIRST_LAYER,
      inked: new Set([FIRST_LAYER]),
      currentInked: true,
      versions: new Map(),
    };
    reopen({ ...keptHalfway, currentLayer: 2 });
    await settle();
    expect(sheetCalls.loadedCurrent).toBe(2);
    expect(keptRecord()).toMatchObject({ currentLayer: FIRST_LAYER });
  });

  it("shows a failed mark until another mark lands", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    reopen(keptHalfway);
    await settle();
    act(() => sheetCalls.inkFailed(new Error("out of memory")));
    expect(chip()).toContain(strings.stickerCreation.layers.inkFailed.en);
    expect(error).toHaveBeenCalledOnce();
    act(() => sheetCalls.stroke());
    expect(document.querySelector(".seal-chip.is-on")).toBeNull();
    error.mockRestore();
  });

  it("clears a failed drawing update after a layer change succeeds", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    reopen(keptHalfway);
    await settle();
    act(() => sheetCalls.inkFailed(new Error("out of memory")));
    expect(chip()).toContain(strings.stickerCreation.layers.inkFailed.en);
    act(() => document.querySelector<HTMLButtonElement>(".layer-add")?.click());
    expect(document.querySelector(".seal-chip.is-on")).toBeNull();
    error.mockRestore();
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
    openScreen(
      session,
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

  it("empty preview leaves the begun Kyoto Seika clock running", async () => {
    preview.prepare.mockReturnValue("empty");
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    await countedAfter(tapTimer);
    expect(await countedAfter(clickSealKey)).toBeGreaterThan(0);
  });

  it("expired invisible Kyoto Seika ink retains the pair and ticket", async () => {
    preview.prepare.mockReturnValue("empty");
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    await openKyotoSeikaSheet(
      { ...keptHalfway, ticket: 9, kyotoSeika: BEGUN, elapsedMs: sessionMs(true) },
      { seal },
    );
    expect(keptRecord()).toMatchObject({
      ticket: 9,
      kyotoSeika: BEGUN,
      elapsedMs: sessionMs(true),
    });
    expect(sealSheet()?.querySelector(".subject-pair")?.textContent).toContain(WIND.ja);
    expect(sealSheet()?.querySelector(".subject-pair")?.textContent).toContain(REUNION.ja);
    expect(sealSheet()?.querySelector("h2")?.textContent).toBe(
      strings.stickerCreation.sealSheet.pencilsDown.en,
    );
    expect(seal).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(sealSheet()?.querySelector(".seal-sheet__preview-status"));
  });

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
      generation: "saved-generation",
      ticket: 9,
      elapsedMs: 0,
      nsfw: false,
      currentLayer: FIRST_LAYER,
      kyotoSeika: { subjects: five, picked: [3], rolls: CHARRED_AT_ROLL, begun: false },
      steps: [],
      frame: null,
    });
    expect(dice()[0].getAttribute("aria-disabled")).toBe("true");
    expect(subjects().map(subjectOf)).toEqual(five);
    expect(pressed()).toEqual(["false", "false", "false", "true", "false"]);
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
    view?.rerender(screenAsApp(false));
    await settle(1000);
    view?.rerender(screenAsApp(true));
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

  it("puts a drawing whose pair a later build can't read back at its deal, on its full clock, and seals it with the pair picked from the deal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sealing.cut.mockResolvedValue(cutSticker());
    loads();
    const me = someoneNew();
    // Halfway through a begun sheet, kept by a build whose subjects this one can't read.
    vi.useFakeTimers();
    const halfway = sessionMs(true) / 2;
    const keeper = new SessionKeeper(me.id);
    keeper.start(9);
    keeper.save([{ tool: "brush", layer: 1, color: "#1C1824", pts: [], T: 0 }], halfway, FRAME);
    await settle(1000);
    const pair = [{ word: WIND.ja }, { word: REUNION.ja }];
    localStorage.setItem(
      personKey("draw.session", me.id),
      JSON.stringify({
        ...JSON.parse(localStorage.getItem(personKey("draw.session", me.id)) ?? "{}"),
        ticket: 9,
        elapsedMs: halfway,
        nsfw: false,
        kyotoSeika: { subjects: pair, picked: [0, 1], rolls: 0, begun: true },
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
    await tapSealKey();
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(seal.mock.calls[0]?.[0].kyotoSeikaSubjects).toEqual(picked.map((s) => s && pick(s)));
  });

  it("holds a begun sheet's clock for tools during recording, while a timer tap still only explains its rule", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    // A reload's pause still lets go at a tap.
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    for (const [index, takeTool] of TOOLS_IN_HAND.entries()) {
      expect(await countedAfter(takeTool)).toBe(0);
      expect(sheetCalls.settings?.panelOpen).toBe(index < 3);
      expect(await countedAfter(putToolsDown)).toBeGreaterThan(0);
      expect(sheetCalls.settings?.panelOpen).toBe(false);
    }
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    expect(timerCalls.clockRuns).toBe(1);
  });

  it("holds a begun sheet's clock while the opacity thumb is held during recording", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    act(() =>
      sheetCalls.layers({
        state: {
          layers: [FIRST_LAYERS.layers[0], { id: 2, opacity: 100, locked: false, clipped: false }],
          nextId: 3,
        },
        current: 1,
        inked: new Set([1]),
        currentInked: true,
        versions: new Map(),
      }),
    );
    expect(await countedAfter(tapTimer)).toBeGreaterThan(0);
    act(() => document.querySelector<HTMLButtonElement>('[data-layer-chip="1"]')?.click());
    const thumb = document.querySelector(".opacity-slider");
    expect(thumb).not.toBeNull();
    expect(
      await countedAfter(() => {
        thumb?.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 25,
            clientX: 8,
            clientY: 100,
            bubbles: true,
          }),
        );
      }),
    ).toBe(0);
    expect(
      await countedAfter(() => {
        thumb?.dispatchEvent(new PointerEvent("pointerup", { pointerId: 25, bubbles: true }));
        document.querySelector<HTMLButtonElement>('[aria-label="Close layer options"]')?.click();
      }),
    ).toBeGreaterThan(0);
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

  it("keeps a begun sheet's remaining time while a tool is open, then calls time after it closes", async () => {
    await openKyotoSeikaSheet({
      ...keptHalfway,
      ticket: 9,
      elapsedMs: sessionMs(true) - 2000,
      kyotoSeika: BEGUN,
    });
    act(tapTimer);
    act(openPanel("color"));
    expect(document.querySelector(".color-sheet")).not.toBeNull();
    await settle(3000);
    expect(sealSheet()).toBeNull();
    expect(document.querySelector(".color-sheet")).not.toBeNull();
    act(putToolsDown);
    await settle(3000);
    expect(sealSheet()?.querySelector("h2")?.textContent).toBe(
      strings.stickerCreation.sealSheet.pencilsDown.en,
    );
    expect(document.querySelector(".color-sheet")).toBeNull();
  });

  it("shows a begun sheet's pair on its seal sheet, whose sticker wears the Kyoto Seika Practice Mode foil, and pink once marked 18+", async () => {
    await openKyotoSeikaSheet({ ...keptHalfway, ticket: 9, kyotoSeika: BEGUN });
    await tapSealKey();
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

describe("a press on the sheet", () => {
  /** A pointer landing on the sheet. */
  const pressSheet = (pointerId: number) =>
    act(
      () =>
        void document
          .querySelector(".ink-sheet")
          ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId })),
    );

  it("closes whatever panel is open and is swallowed, so it draws nothing, and with none open is the sheet's own", async () => {
    reopen(keptHalfway);
    await settle();
    // On a phone the color sheet is a bottom sheet, which a press anywhere else leaves open.
    act(openPanel("color"));
    pressSheet(5);
    expect(document.querySelector(".color-sheet")).toBeNull();
    act(openPanel("clear"));
    pressSheet(6);
    expect(document.querySelector(".clear-bar.is-open")).toBeNull();
    pressSheet(7);
    expect(sheetCalls.swallowed).toEqual([5, 6]);
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

describe("spending a sheet's ticket", () => {
  it("keeps the spend's key while the sheet's record can't be written, so a reload gets that ticket use back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const write = localStorage.setItem.bind(localStorage);
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === personKey("draw.session", TEST_ME.id))
        throw new DOMException("full", "QuotaExceededError");
      write(key, value);
    });
    onTestFinished(() => {
      setItem.mockRestore();
      vi.mocked(console.error).mockRestore();
    });
    reopen({ status: "none" }, {}, TEST_ME, {
      spendTicket: () => Promise.resolve(spentDaily(false)),
    });
    await settle();
    expect(sheet).toBe("held");
    expect(keptSpend(TEST_ME.id)).not.toBeNull();
  });
});

describe("a drawing another tab starts", () => {
  afterEach(() => vi.restoreAllMocks());

  /** This tab is shown again after another tab began keeping a drawing for the same person. */
  const shownAfterAnotherTabKeeps = () => {
    const record = { ticket: 9, elapsedMs: 0, nsfw: false };
    localStorage.setItem(personKey("draw.session", TEST_ME.id), JSON.stringify(record));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
  };

  it("is taken up as a reload does when this tab, shown again, has no drawing of its own", async () => {
    const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
    // The tickets haven't come, so this sheet spends none while it waits.
    reopen({ status: "none" }, {}, TEST_ME, { tickets: () => new Promise(() => {}) });
    await settle();
    shownAfterAnotherTabKeeps();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("leaves this tab's own drawing as it is", async () => {
    const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
    reopen(keptHalfway);
    await settle();
    shownAfterAnotherTabKeeps();
    expect(reload).not.toHaveBeenCalled();
    await settle();
  });
});

const unverified: KeptSession = {
  status: "unverified",
  ticket: 7,
  kyotoSeika: null,
  reason: "legacy",
  recovery: { steps: [{ tool: "brush", layer: 1, color: "red", pts: [], T: 0 }], frame: FRAME },
  error: new Error("Saved drawing identity is missing"),
};

describe("recovering an unverified saved drawing", () => {
  it.each(["Escape", "Back"])(
    "closing recovery with %s preserves the saved drawing and spends no ticket",
    async (closeWith) => {
      const record = JSON.stringify({ ticket: 7, elapsedMs: 1000, nsfw: false });
      localStorage.setItem(personKey("draw.session", TEST_ME.id), record);
      const spendTicket = vi.fn<ApiClient["spendTicket"]>();
      reopen(unverified, {}, TEST_ME, { spendTicket });
      await settle();
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(sheetCalls.settings?.locked).toBe(true);
      act(() => {
        if (closeWith === "Back")
          window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
        else
          document.activeElement?.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
      });
      await settle();
      expect(buttonSaying("Download saved drawing")).toBeUndefined();
      expect(buttonSaying("Review saved drawing")).toBeDefined();
      act(() => drawingScreen.current?.startNewSticker());
      await settle();
      expect(localStorage.getItem(personKey("draw.session", TEST_ME.id))).toBe(record);
      expect(sheetCalls.settings?.locked).toBe(true);
      expect(spendTicket).not.toHaveBeenCalled();
      expect(document.querySelector(".seal-key")).toBeNull();
    },
  );

  it("explicit discard starts a fresh generation on the current unsealed ticket", async () => {
    const spendTicket = vi.fn<ApiClient["spendTicket"]>();
    reopen(unverified, {}, TEST_ME, { spendTicket });
    await settle();
    const discard = buttonSaying("Discard saved drawing and start blank");
    expect(discard).toBeDefined();
    act(() => discard?.click());
    await settle();
    expect(keptRecord()).toMatchObject({ ticket: 7, elapsedMs: 0 });
    expect(keptRecord()).toHaveProperty("generation", expect.any(String));
    expect(sheetCalls.settings?.locked).toBe(false);
    expect(spendTicket).not.toHaveBeenCalled();
  });

  it("an absent ticket remains saved until explicit abandonment", async () => {
    keepSentSeal(TEST_ME.id, 7);
    const record = JSON.stringify({ ticket: 7, elapsedMs: 1000, nsfw: false });
    localStorage.setItem(personKey("draw.session", TEST_ME.id), record);
    const spendTicket = vi.fn<ApiClient["spendTicket"]>();
    reopen(unverified, { usedToday: [] }, TEST_ME, { spendTicket });
    await settle();
    expect(buttonSaying("Discard saved drawing and start blank")).toBeUndefined();
    expect(buttonSaying("Discard drawing and abandon old ticket")).toBeDefined();
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(localStorage.getItem(personKey("draw.session", TEST_ME.id))).toBe(record);
    expect(sealWentOut(TEST_ME.id, 7)).toBe(true);
    expect(spendTicket).not.toHaveBeenCalled();
  });
});

it.each(["initial", "late"])(
  "after JST rollover, %s recovery exports then abandons the old ticket before a new explicit start",
  async (read) => {
    const me = { ...TEST_ME, id: `rollover-${read}` };
    vi.spyOn(console, "error").mockImplementation(() => {});
    let downloaded: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      if (blob instanceof Blob) downloaded = blob;
      return "blob:recovery";
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const record = JSON.stringify({ ticket: 7, elapsedMs: 1000, nsfw: false });
    localStorage.setItem(personKey("draw.session", me.id), record);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(`drawing-session.${me.id}`, 3);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("ops");
        request.result.createObjectStore("progress");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    onTestFinished(() => db.close());
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["ops", "progress"], "readwrite");
      tx.objectStore("ops").put({ tool: "brush", layer: 1, color: "red", pts: [], T: 0 }, 0);
      tx.objectStore("progress").put(1, 0);
      tx.objectStore("progress").put(FRAME, 1);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const savedSteps = () =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction("ops").objectStore("ops").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    let finishRead!: (value: KeptSession) => void;
    const later = new Promise<Exclude<KeptSession, { status: "none" }>>((resolve) => {
      finishRead = (value) => {
        if (value.status !== "none") resolve(value);
      };
    });
    const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(spentDaily(false)));
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    sealing.cut.mockResolvedValue(cutSticker());
    if (read === "initial") keepSentSeal(me.id, 7);
    reopen(
      read === "initial"
        ? unverified
        : { status: "unread", ticket: 7, kyotoSeika: null, error: new Error("slow read"), later },
      { ticketDay: "2026-09-27", usedToday: [] },
      me,
      { spendTicket, seal },
    );
    await settle();
    if (read === "late") {
      expect(sheetCalls.settings?.locked).toBe(false);
      keepSentSeal(me.id, 7);
      await act(async () => {
        finishRead(unverified);
        await later;
      });
      await settle();
    }
    const savedBeforeDownload = localStorage.getItem(personKey("draw.session", me.id));
    act(() => buttonSaying("Download saved drawing")?.click());
    if (!downloaded) throw new Error("The saved drawing was not exported");
    if (unverified.status !== "unverified" || !unverified.recovery)
      throw new Error("Expected recovery data");
    expect(JSON.parse(await downloaded.text())).toEqual(unverified.recovery);
    expect(localStorage.getItem(personKey("draw.session", me.id))).toBe(savedBeforeDownload);
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(spendTicket).not.toHaveBeenCalled();
    expect(sealWentOut(me.id, 7)).toBe(true);
    const beforeAbandon = savedSteps();
    await settle(25);
    expect(await beforeAbandon).toEqual(unverified.recovery.steps);
    const abandon = buttonSaying("Discard drawing and abandon old ticket");
    expect(abandon).toBeDefined();
    expect(abandon?.disabled).toBe(false);
    act(() => abandon?.click());
    await settle();
    expect(localStorage.getItem(personKey("draw.session", me.id))).toBeNull();
    expect(sealWentOut(me.id, 7)).toBe(false);
    const afterAbandon = savedSteps();
    await settle(25);
    expect(await afterAbandon).toEqual([]);
    expect(sheet).toBe("fresh");
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(spendTicket).not.toHaveBeenCalled();
    await tapSealKey();
    sealOnSheet();
    await settle();
    expect(seal).not.toHaveBeenCalled();
    const start = buttonSaying(strings.tickets.startDrawing.daily.start.en);
    expect(start).toBeDefined();
    act(() => start?.click());
    await settle();
    expect(spendTicket).toHaveBeenCalledOnce();
    expect(
      JSON.parse(localStorage.getItem(personKey("draw.session", me.id)) ?? "null"),
    ).toMatchObject({ ticket: 9 });
    expect(sheetCalls.settings?.locked).toBe(false);
    act(() => sheetCalls.stroke());
    await tapSealKey();
    await settle(1000);
    sealOnSheet();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    expect(seal.mock.calls[0]?.[0]).toMatchObject({ ticketUseId: 9 });
  },
);

it("failed Seal reconciliation retries without discarding, then permits explicit replacement", async () => {
  keepSentSeal(TEST_ME.id, 7);
  const record = JSON.stringify({ ticket: 7, elapsedMs: 1000, nsfw: false });
  localStorage.setItem(personKey("draw.session", TEST_ME.id), record);
  const tickets = vi
    .fn<ApiClient["tickets"]>()
    .mockRejectedValueOnce(
      new ApiError(503, { error: "unavailable", detail: "Ticket check unavailable" }),
    )
    .mockResolvedValue({
      ...FRESH_TICKETS,
      usedToday: [{ id: 7, dayIndex: 0, kind: "daily", sticker: null }],
    });
  const spendTicket = vi.fn<ApiClient["spendTicket"]>();
  reopen(unverified, {}, TEST_ME, { tickets, spendTicket });
  await settle();
  expect(document.querySelector('[role="alert"]')?.textContent).toBeTruthy();
  expect(buttonSaying("Discard saved drawing and start blank")?.disabled).toBe(true);
  const retry = buttonSaying(strings.ui.errorLine.tryAgain.en);
  expect(retry).toBeDefined();
  act(() => retry?.click());
  await settle();
  expect(localStorage.getItem(personKey("draw.session", TEST_ME.id))).toBe(record);
  expect(sheetCalls.settings?.locked).toBe(true);
  expect(spendTicket).not.toHaveBeenCalled();
  expect(buttonSaying("Discard saved drawing and start blank")?.disabled).toBe(false);
  act(() => buttonSaying("Discard saved drawing and start blank")?.click());
  await settle();
  expect(keptRecord()).toMatchObject({ ticket: 7 });
  expect(keptRecord()).toHaveProperty("generation", expect.any(String));
  expect(sheetCalls.settings?.locked).toBe(false);
  expect(sealWentOut(TEST_ME.id, 7)).toBe(false);
});

it("recovery cannot reuse a ticket with a completed Seal", async () => {
  keepSentSeal(TEST_ME.id, 7);
  const record = JSON.stringify({ ticket: 7, elapsedMs: 1000, nsfw: false });
  localStorage.setItem(personKey("draw.session", TEST_ME.id), record);
  const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(spentDaily(false)));
  reopen(
    unverified,
    {
      usedToday: [
        {
          id: 7,
          dayIndex: 0,
          kind: "daily",
          sticker: { id: "sealed", outline: "M0 0Z", width: 10, height: 10 },
        },
      ],
    },
    TEST_ME,
    { spendTicket },
  );
  await settle();
  expect(localStorage.getItem(personKey("draw.session", TEST_ME.id))).toBe(record);
  expect(sheetCalls.settings?.locked).toBe(true);
  expect(spendTicket).not.toHaveBeenCalled();
  act(() => buttonSaying("Discard saved drawing and start blank")?.click());
  await settle();
  expect(keptRecord()).toMatchObject({ ticket: 9 });
  expect(sealWentOut(TEST_ME.id, 7)).toBe(false);
});

it("late recovery discards a completed Seal without leaving its carried ticket on the sheet", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  let finishRead!: (value: Extract<KeptSession, { status: "unverified" }>) => void;
  const later = new Promise<Extract<KeptSession, { status: "unverified" }>>((resolve) => {
    finishRead = resolve;
  });
  const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(spentDaily(false)));
  reopen(
    { status: "unread", ticket: 7, kyotoSeika: null, error: new Error("slow read"), later },
    {
      usedToday: [
        {
          id: 7,
          dayIndex: 0,
          kind: "daily",
          sticker: { id: "sealed", outline: "M0 0Z", width: 10, height: 10 },
        },
      ],
    },
    TEST_ME,
    { spendTicket },
  );
  await settle();
  expect(sheetCalls.settings?.locked).toBe(false);
  keepSentSeal(TEST_ME.id, 7);
  if (unverified.status !== "unverified" || !unverified.recovery)
    throw new Error("Expected recovery data");
  await act(async () => {
    finishRead(unverified);
    await later;
  });
  await settle();
  expect(sheetCalls.settings?.locked).toBe(true);
  act(() => buttonSaying("Discard saved drawing and start blank")?.click());
  await settle();
  expect(keptRecord()).toMatchObject({ ticket: 9 });
  expect(error).toHaveBeenCalledOnce();
});

it("late recovery locks a carried Kyoto Seika sheet before Begin", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  subjectList.load.mockResolvedValue({ subjects: TEST_SUBJECTS, notices: "" });
  const kyotoSeika: KeptKyotoSeika = { subjects: null, picked: [], rolls: 0, begun: false };
  let finishRead!: (value: Extract<KeptSession, { status: "unverified" }>) => void;
  const later = new Promise<Extract<KeptSession, { status: "unverified" }>>((resolve) => {
    finishRead = resolve;
  });
  reopen({ status: "unread", ticket: 7, kyotoSeika, error: new Error("slow read"), later });
  await settle();
  if (unverified.status !== "unverified" || !unverified.recovery)
    throw new Error("Expected recovery data");
  await act(async () => {
    finishRead({ ...unverified, kyotoSeika });
    await later;
  });
  await settle();
  expect(buttonSaying("Download saved drawing")).toBeDefined();
  expect(sheetCalls.settings?.locked).toBe(true);
  expect(document.querySelector(".kyoto-seika-deal")).toBeNull();
});

it.each([true, false])(
  "unknown metadata keeps the sheet locked until explicit discard, with readable ink=%s",
  async (readable) => {
    if (unverified.status !== "unverified") throw new Error("Expected recovery data");
    const spendTicket = vi.fn<ApiClient["spendTicket"]>();
    reopen(
      {
        ...unverified,
        ticket: null,
        reason: "metadata-unavailable",
        recovery: readable ? unverified.recovery : null,
      },
      {},
      TEST_ME,
      { spendTicket },
    );
    await settle();
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(Boolean(buttonSaying("Download saved drawing"))).toBe(readable);
    expect(buttonSaying("Try again")).toBeDefined();
    act(() => drawingScreen.current?.startNewSticker());
    await settle();
    expect(spendTicket).not.toHaveBeenCalled();
    expect(document.querySelector(".seal-key")).toBeNull();
    act(() => buttonSaying("Discard saved drawing")?.click());
    await settle();
    expect(spendTicket).not.toHaveBeenCalled();
    expect(localStorage.getItem(personKey("draw.session", TEST_ME.id))).toBeNull();
    expect(buttonSaying("Download saved drawing")).toBeUndefined();
  },
);

describe("finishing Fill on the drawing screen", () => {
  const pendingFill = { acceptedPending: true, transitionPending: false, settling: false };
  function pending() {
    let resolve = () => {};
    let reject = (_error: unknown) => {};
    const promise = new Promise<void>((done, failed) => {
      resolve = done;
      reject = failed;
    });
    const finish = { promise, resolve, reject };
    sheetCalls.finish.mockReturnValue(finish.promise);
    act(() => sheetCalls.fillState(pendingFill));
    return finish;
  }
  async function openBlank() {
    reopen({ ...keptHalfway, steps: [], elapsedMs: 0 });
    await settle();
  }

  it("offers Seal for accepted pending Fill, waits for ink, and rejects an empty result", async () => {
    await openBlank();
    expect(document.querySelector(".seal-key.is-shown")).toBeNull();
    const finish = pending();
    expect(document.querySelector(".seal-key.is-shown")).not.toBeNull();
    act(clickSealKey);
    expect(sealSheet()).toBeNull();
    expect(sheetCalls.composites).toHaveLength(0);
    finish.resolve();
    await settle();
    expect(sealSheet()).toBeNull();
    expect(sheetCalls.composites).toHaveLength(0);
  });

  it("rechecks completed first Fill before opening Seal and shares duplicate taps", async () => {
    await openBlank();
    const finish = pending();
    act(() => {
      clickSealKey();
      clickSealKey();
    });
    expect(sheetCalls.finish).toHaveBeenCalledTimes(1);
    act(() => sheetCalls.stroke());
    expect(sealSheet()).toBeNull();
    finish.resolve();
    await settle();
    expect(sealSheet()).not.toBeNull();
  });

  it.each([
    { action: "panel", kyotoSeika: false },
    { action: "pause", kyotoSeika: false },
    { action: "panel", kyotoSeika: true },
  ] as const)(
    "holds the clock immediately for $action, then releases its hold on failure (Kyoto Seika: $kyotoSeika)",
    async ({ action, kyotoSeika }) => {
      reopen(
        {
          ...keptHalfway,
          kyotoSeika: kyotoSeika
            ? { subjects: [WIND, REUNION], picked: [0, 1], rolls: 0, begun: true }
            : null,
        },
        {},
        { ...TEST_ME, kyotoSeikaPractice: kyotoSeika },
      );
      await settle();
      act(tapTimer);
      await settle();
      const finish = pending();
      act(action === "panel" ? openPanel("color") : tapTimer);
      expect(document.querySelector(".color-sheet")).toBeNull();
      expect(sheetCalls.settings?.paused).toBe(false);
      expect(await countedAfter(() => {})).toBe(0);
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      finish.reject(new Error("worker stopped"));
      await settle();
      expect(document.querySelector(".color-sheet")).toBeNull();
      expect(await countedAfter(() => {})).toBeGreaterThan(0);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    },
  );

  it("retains the selected tool, blocks competing controls and shortcuts, and shows delayed status", async () => {
    reopen(keptHalfway);
    await settle();
    act(() => buttonSaying("Fill")?.click());
    const finish = pending();
    act(() => buttonSaying("Brush")?.click());
    expect(buttonSaying("Fill")?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".seal-chip")?.textContent).not.toContain("Finishing fill…");
    await settle(149);
    expect(document.querySelector(".seal-chip")?.textContent).not.toContain("Finishing fill…");
    await settle(1);
    expect(document.querySelector(".seal-chip")?.textContent).toContain("Finishing fill…");
    await act(() => i18next.changeLanguage("ja"));
    expect(chip()).toContain("塗りつぶしを処理中…");
    await act(() => i18next.changeLanguage("en"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    });
    finish.resolve();
    await settle();
    expect(buttonSaying("Brush")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("retains Fill failure through history and late commits in either language", async () => {
    reopen(keptHalfway);
    await settle();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const finish = pending();
    act(clickSealKey);
    finish.reject(new Error("worker stopped"));
    await settle();
    act(() => sheetCalls.history({ hasInk: true, canUndo: true, canRedo: false }));
    act(() => sheetCalls.stroke());
    expect(document.querySelector(".seal-chip")?.textContent).toContain(
      "Fill stopped before it finished. Completed areas are still here.",
    );
    await act(() => i18next.changeLanguage("ja"));
    expect(document.querySelector(".seal-chip")?.textContent).toContain(
      "塗りつぶしを完了できませんでした。塗り終わった部分は残っています。",
    );
    await act(() => i18next.changeLanguage("en"));
    error.mockRestore();
  });

  it("closes input at time-up before awaiting the first Fill and stays locked through its commit", async () => {
    reopen({ ...keptHalfway, steps: [], elapsedMs: sessionMs(false) - 100 });
    await settle();
    act(tapTimer);
    await settle();
    const finish = pending();
    await settle(200);
    expect(sheetCalls.closeInput).toHaveBeenCalledOnce();
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(sealSheet()).toBeNull();
    act(() => sheetCalls.stroke());
    expect(sheetCalls.settings?.locked).toBe(true);
    await settle(1000);
    expect(sheetCalls.settings?.sessionMs()).toBe(sessionMs(false));
    finish.resolve();
    await settle();
    expect(sealSheet()?.textContent).toContain(strings.stickerCreation.sealSheet.timeUp.en);
    expect(sheetCalls.settings?.locked).toBe(true);
  });

  it.each(["pagehide", "visibilitychange"])(
    "aborts %s work synchronously before keeping committed steps and invalidates a pending panel",
    async (event) => {
      reopen(keptHalfway);
      await settle();
      const finish = pending();
      act(openPanel("color"));
      const order: string[] = [];
      sheetCalls.abort.mockImplementation(() => order.push("abort"));
      const save = vi.spyOn(SessionKeeper.prototype, "save").mockImplementation(() => {
        order.push("save");
      });
      const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      act(() => {
        (event === "pagehide" ? window : document).dispatchEvent(new Event(event));
      });
      visibility.mockRestore();
      expect(order.slice(0, 2)).toEqual(["abort", "save"]);
      expect(save).toHaveBeenLastCalledWith(sheetCalls.steps, expect.any(Number), FRAME);
      finish.resolve();
      await settle();
      expect(document.querySelector(".color-sheet")).toBeNull();
      save.mockRestore();
    },
  );

  it("cancels the transition and pending worker on unmount", async () => {
    reopen(keptHalfway);
    await settle();
    const finish = pending();
    act(openPanel("color"));
    view?.unmount();
    view = undefined;
    expect(sheetCalls.abort).toHaveBeenCalledWith("drawing screen unmounted");
    finish.resolve();
    await settle();
  });
  it("waits for final ink before reading steps, frame, timelapse, and composite for sealing", async () => {
    sealing.cut.mockResolvedValue(cutSticker());
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    reopen(keptHalfway, {}, TEST_ME, { seal });
    await settle();
    await tapSealKey();
    const finish = pending();
    const save = vi.spyOn(SessionKeeper.prototype, "save");
    sheetCalls.finalRead.mockClear();
    sheetCalls.composites = [];
    sealOnSheet();
    expect(sheetCalls.finalRead).not.toHaveBeenCalled();
    const steps: Step[] = [
      { tool: "fill", layer: 1, color: "#ff0000", x: 12, y: 14, gap: 0, T: 12, reference: "layer" },
    ];
    sheetCalls.steps = steps;
    finish.resolve();
    await settle(1000);
    expect(sheetCalls.composites).toHaveLength(1);
    expect(save).toHaveBeenCalledWith(steps, expect.any(Number), FRAME);
    expect(seal).toHaveBeenCalledOnce();
    save.mockRestore();
  });

  it("never reads final ink or submits a seal when finishing fails", async () => {
    const seal = vi.fn<ApiClient["seal"]>();
    reopen(keptHalfway, {}, TEST_ME, { seal });
    await settle();
    await tapSealKey();
    const finish = pending();
    sheetCalls.finalRead.mockClear();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sealOnSheet();
    finish.reject(new FillError("worker stopped"));
    await settle();
    expect(sheetCalls.finalRead).not.toHaveBeenCalled();
    expect(seal).not.toHaveBeenCalled();
    expect(chip()).toContain(strings.stickerCreation.fillReference.failed.en);
    error.mockRestore();
  });

  it.each(["color", "reference"] as const)("keeps the old %s until completion", async (choice) => {
    reopen(keptHalfway);
    await settle();
    act(() => buttonSaying("Fill")?.click());
    const oldColor = sheetCalls.settings?.color;
    const finish = pending();
    act(() => {
      if (choice === "color") sheetCalls.color("#ff0000");
      else document.querySelector<HTMLInputElement>('input[value="visible"]')?.click();
    });
    expect(sheetCalls.settings?.color).toBe(oldColor);
    expect(sheetCalls.settings?.fillReference).toBe("layer");
    expect(document.querySelector(".drawing-controls")?.hasAttribute("disabled")).toBe(true);
    const selected = sheetCalls.selected.length;
    act(() => document.querySelector<HTMLButtonElement>(".layer-add")?.click());
    expect(sheetCalls.selected).toHaveLength(selected);
    expect(sheetCalls.steps).toEqual([]);
    finish.resolve();
    await settle();
    if (choice === "color") expect(sheetCalls.settings?.color).toBe("#ff0000");
    else expect(sheetCalls.settings?.fillReference).toBe("visible");
  });

  it("reports a distinct unexpected action while a transition is pending", async () => {
    reopen(keptHalfway);
    await settle();
    const finish = pending();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      sheetCalls.color("#ff0000");
      sheetCalls.color("#00ff00");
    });
    expect(error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: "A fill transition is already pending" }),
    );
    finish.resolve();
    await settle();
    expect(sheetCalls.settings?.color).toBe("#ff0000");
    error.mockRestore();
  });

  it.each([false, true])(
    "time-up replaces a pending control without extra drawing time (Kyoto Seika: %s)",
    async (kyotoSeika) => {
      const length = sessionMs(kyotoSeika);
      reopen(
        {
          ...keptHalfway,
          elapsedMs: length - 100,
          kyotoSeika: kyotoSeika
            ? {
                subjects: [WIND, REUNION],
                picked: [0, 1],
                rolls: 0,
                begun: true,
              }
            : null,
        },
        {},
        { ...TEST_ME, kyotoSeikaPractice: kyotoSeika },
      );
      await settle();
      act(tapTimer);
      await settle();
      const finish = pending();
      const oldColor = sheetCalls.settings?.color;
      act(() => sheetCalls.color("#ff0000"));
      await settle(300);
      expect(sheetCalls.closeInput).toHaveBeenCalledOnce();
      expect(sheetCalls.settings?.locked).toBe(true);
      expect(sheetCalls.abort).not.toHaveBeenCalled();
      finish.resolve();
      await settle(1000);
      expect(sheetCalls.settings?.color).toBe(oldColor);
      expect(document.querySelector(".color-sheet")).toBeNull();
      expect(sealSheet()?.textContent).toContain(
        kyotoSeika
          ? strings.stickerCreation.sealSheet.pencilsDown.en
          : strings.stickerCreation.sealSheet.timeUp.en,
      );
      expect(sheetCalls.settings?.sessionMs()).toBe(length);
      expect(keptRecord()?.elapsedMs).toBe(length);
    },
  );

  it("keeps time-up locked after failure and lets an explicit retry review the retained drawing", async () => {
    reopen({ ...keptHalfway, elapsedMs: sessionMs(false) - 100 });
    await settle();
    act(tapTimer);
    await settle();
    const finish = pending();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await settle(200);
    finish.reject(new FillError("worker stopped"));
    await settle();
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(sealSheet()).toBeNull();
    act(() => sheetCalls.stroke());
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(chip()).toContain(strings.stickerCreation.fillReference.failed.en);
    sheetCalls.finish.mockResolvedValue();
    await tapSealKey();
    expect(sealSheet()).not.toBeNull();
    error.mockRestore();
  });

  it("keeps worker FillError after routine history and obsolete state notifications", async () => {
    reopen(keptHalfway);
    await settle();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => sheetCalls.inkFailed(new FillError("worker stopped")));
    act(() => {
      sheetCalls.history({ hasInk: true, canUndo: true, canRedo: false });
      sheetCalls.fillState({ acceptedPending: false, transitionPending: false, settling: false });
    });
    expect(chip()).toContain(strings.stickerCreation.fillReference.failed.en);
    error.mockRestore();
  });
  it("offers recovery after the first Fill fails at time-up with no completed ink", async () => {
    reopen({ ...keptHalfway, steps: [], elapsedMs: sessionMs(false) - 100 });
    await settle();
    act(tapTimer);
    await settle();
    const finish = pending();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await settle(200);
    finish.reject(new FillError("worker stopped"));
    await settle();
    act(() =>
      sheetCalls.fillState({ acceptedPending: false, transitionPending: false, settling: false }),
    );
    expect(document.querySelector(".seal-key.is-shown")).not.toBeNull();
    sheetCalls.finish.mockResolvedValue();
    await tapSealKey();
    expect(chip()).toContain(strings.stickerCreation.seal.emptyAtTimeUp.en);
    error.mockRestore();
  });

  it("retries a failed seal after the clock reached its cutoff in this visit", async () => {
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    reopen({ ...keptHalfway, elapsedMs: sessionMs(false) - 100 }, {}, TEST_ME, { seal });
    await settle();
    act(tapTimer);
    await settle(200);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sealOnSheet();
    await settle(1000);
    expect(seal).not.toHaveBeenCalled();
    sealing.cut.mockResolvedValue(cutSticker());
    await tapSealKey();
    await settle(1000);
    expect(seal).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it.each([
    ["pagehide", false],
    ["pagehide", true],
    ["visibilitychange", false],
    ["visibilitychange", true],
    ["cover", false],
    ["cover", true],
  ] as const)("resolves cutoff after %s cancels Fill (completed ink: %s)", async (event, inked) => {
    const steps = inked ? keptHalfway.steps : [];
    reopen({ ...keptHalfway, steps, elapsedMs: sessionMs(false) - 100 }, {}, TEST_ME, {
      spendTicket: () => new Promise(() => {}),
    });
    await settle();
    sheetCalls.steps = [...steps];
    act(tapTimer);
    await settle();
    const finish = pending();
    const oldColor = sheetCalls.settings?.color;
    act(() => sheetCalls.color("#ff0000"));
    await settle(200);
    expect(sheetCalls.settings?.locked).toBe(true);
    expect(sealSheet()).toBeNull();
    const save = vi.spyOn(SessionKeeper.prototype, "save");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const order: string[] = [];
    sheetCalls.abort.mockImplementation(() => {
      order.push("abort");
      sheetCalls.fillState({ acceptedPending: false, transitionPending: false, settling: false });
      finish.reject(new FillError("Fill stopped: sheet hidden"));
    });
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      if (event === "cover") view?.rerender(screenAsApp(false));
      else (event === "pagehide" ? window : document).dispatchEvent(new Event(event));
    });
    expect(order).toContain("abort");
    expect(sheetCalls.abort.mock.invocationCallOrder[0]).toBeLessThan(
      save.mock.invocationCallOrder[0],
    );
    expect(save).toHaveBeenCalledWith(steps, sessionMs(false), FRAME);
    visibility.mockReturnValue("visible");
    act(() => {
      if (event === "cover") view?.rerender(screenAsApp(true));
      else document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle();
    expect(error).not.toHaveBeenCalled();
    if (inked) {
      expect(sealSheet()?.textContent).toContain(strings.stickerCreation.sealSheet.timeUp.en);
      expect(sheetCalls.settings?.locked).toBe(true);
      expect(sheetCalls.settings?.sessionMs()).toBe(sessionMs(false));
      expect(sheetCalls.settings?.color).toBe(oldColor);
    } else {
      expect(chip()).toContain(strings.stickerCreation.seal.emptyAtTimeUp.en);
      expect(sheetCalls.settings?.sessionMs()).toBe(0);
      expect(document.querySelector(".drawing-controls")?.hasAttribute("disabled")).toBe(false);
    }
    visibility.mockRestore();
    save.mockRestore();
    error.mockRestore();
  });

  it.each(["reset", "unmount"])(
    "does not revive obsolete cutoff recovery after %s",
    async (action) => {
      reopen({ ...keptHalfway, steps: [], elapsedMs: sessionMs(false) - 100 }, {}, TEST_ME, {
        spendTicket: () => new Promise(() => {}),
      });
      await settle();
      act(tapTimer);
      await settle();
      const finish = pending();
      await settle(200);
      const save = vi.spyOn(SessionKeeper.prototype, "save");
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      if (action === "reset") act(() => drawingScreen.current?.startNewSticker());
      else {
        view?.unmount();
        view = undefined;
      }
      save.mockClear();
      finish.resolve();
      await settle();
      expect(save).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(sealSheet()).toBeNull();
      if (action === "reset") {
        expect(sheetCalls.settings?.sessionMs()).toBe(0);
        expect(chip()).not.toContain(strings.stickerCreation.seal.emptyAtTimeUp.en);
      }
      save.mockRestore();
      error.mockRestore();
    },
  );
});
