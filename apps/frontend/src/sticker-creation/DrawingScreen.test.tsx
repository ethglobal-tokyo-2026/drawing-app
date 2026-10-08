// @vitest-environment happy-dom
import {
  KYOTO_SEIKA_TIME_USED_S,
  type KyotoSeikaSubject,
  type Me,
  type Tickets,
} from "@drawing-app/api/client";
import { act, forwardRef, useEffect, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory as FakeIndexedDB } from "fake-indexeddb";
import type { ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import { strings } from "../i18n/strings";
import { useTickets } from "../tickets/useTickets";
import { personKey } from "../ui/deviceStorage";
import type { HistoryState } from "./canvas/inkEngine";
import { DrawingScreen } from "./DrawingScreen";
import { CHARRED_AT_ROLL } from "../kyoto-seika/dieMood";
import { REUNION, TEST_SUBJECTS, WIND } from "../kyoto-seika/testSubjects";
import { LOAD_TIMEOUT_MS, type KeptSession } from "./session/keptSession";
import { keepSentSeal, sealWentOut } from "./session/sentSeal";
import { sessionMs } from "./session/session";

const kept = vi.hoisted(() => ({
  session: { status: "none" } as unknown,
}));
const sheetCalls = vi.hoisted(() => ({
  cleared: 0,
  settings: null as { paused: boolean } | null,
  label: undefined as string | undefined,
}));
const subjectList = vi.hoisted(() => ({ load: vi.fn() }));
const sealing = vi.hoisted(() => ({ cut: vi.fn() }));

vi.mock("./canvas/DrawingCanvas", () => ({
  DrawingCanvas: forwardRef(function Sheet(
    {
      onHistory,
      settings,
      label,
    }: {
      onHistory: (state: HistoryState) => void;
      settings: { paused: boolean };
      label?: string;
    },
    ref,
  ) {
    useEffect(() => {
      sheetCalls.settings = settings;
      sheetCalls.label = label;
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
      inkDensity: () => 1,
    }));
    return <div className="ink-sheet" />;
  }),
}));
vi.mock("./session/keptSession", async (original) => ({
  ...(await original<object>()),
  loadKeptSession: () => Promise.resolve(kept.session),
}));
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
  TimerDot: ({ onToggle }: { onToggle: () => void }) => (
    <button type="button" className="timer-stub" onClick={onToggle} />
  ),
}));
vi.mock("../identity/privy", () => ({ retryPrivySignIn: () => {} }));
vi.mock("../tickets/ReserveTicketCheckout", () => ({ ReserveTicketCheckout: () => null }));
vi.mock("./tools/ColorSheet", () => ({ ColorSheet: () => null }));
vi.mock("./tools/SizeRail", () => ({ SizeRail: () => null }));
vi.mock("./tools/SmoothingBar", () => ({ SmoothingBar: () => null }));
// The tool strip's clear tile, which controls the clear bar as the real one does.
vi.mock("./tools/ToolStrip", () => ({
  ToolStrip: ({
    clearBarId,
    onPanel,
  }: {
    clearBarId: string;
    onPanel: (panel: "clear") => void;
  }) => (
    <button
      type="button"
      className="clear-tile"
      aria-controls={clearBarId}
      onClick={() => onPanel("clear")}
    />
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

let view: { unmount: () => void } | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
  localStorage.clear();
  sheetCalls.cleared = 0;
  sheetCalls.settings = null;
  sheetCalls.label = undefined;
  subjectList.load.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Lets the drawing screen's loads, frames and effects run. */
const settle = async (ms = 0) => {
  for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(ms / 5));
};

/**
 * Opens the drawing screen after a reload that kept `session`, with these tickets from the server,
 * for `me`.
 */
function reopen(session: KeptSession, tickets: Partial<Tickets> = {}, me: Me = TEST_ME) {
  vi.useFakeTimers();
  kept.session = session;
  view = renderWithApi(
    <>
      <DrawingScreen active onSealed={() => {}} onNewSticker={() => {}} onGoToBoard={() => {}} />
      <SheetProbe />
    </>,
    emptyApi({ tickets: () => Promise.resolve({ ...FRESH_TICKETS, ...tickets }) }),
    me,
  );
}

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
};
const chip = () => document.querySelector(".seal-chip")?.textContent ?? "";

describe("the drawing screen's 18+ switch", () => {
  const toggle = () => document.querySelector<HTMLButtonElement>(".nsfw-toggle");

  it("is there for someone with the NSFW opt-in, off until they turn it on", async () => {
    reopen(keptAtTimeUp, {}, { ...TEST_ME, nsfwOptIn: true });
    await settle();
    expect(toggle()?.getAttribute("aria-checked")).toBe("false");
  });

  it("isn't there for someone without it", async () => {
    reopen(keptAtTimeUp);
    await settle();
    expect(toggle()).toBeNull();
  });

  it("stays on a kept drawing marked 18+ after the opt-in went off, so the mark can come off", async () => {
    reopen({ ...keptAtTimeUp, nsfw: true });
    await settle();
    expect(toggle()?.getAttribute("aria-checked")).toBe("true");
  });
});

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

    // Back from its pause at 0:00, it seals, and the cut fails.
    act(() => document.querySelector<HTMLButtonElement>(".timer-stub")?.click());
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
    expect(chip()).toContain(strings.stickerCreation.seal.failed.onThisPhone.en);
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
  /** The server's answer to a daily ticket spent in the mode. */
  const SPENT = {
    ticketUse: {
      id: 9,
      ticketDay: FRESH_TICKETS.ticketDay,
      dayIndex: 0,
      kind: "daily",
      kyotoSeikaPractice: true,
      spentAt: "2026-09-26T00:00:00.000Z",
    },
    tickets: FRESH_TICKETS,
  } as const;

  /** Opens a fresh sheet whose daily ticket is spent in the mode, once the subject list `load`s. */
  async function openKyotoSeikaSheet(
    session: KeptSession = { status: "none" },
    api: Partial<ApiClient> = {},
  ) {
    vi.useFakeTimers();
    kept.session = session;
    view = renderWithApi(
      <DrawingScreen active onSealed={() => {}} onNewSticker={() => {}} onGoToBoard={() => {}} />,
      emptyApi({ spendTicket: () => Promise.resolve(SPENT), ...api }),
      KYOTO_SEIKA_ME,
    );
    await settle();
  }
  const dice = () => [...document.querySelectorAll<HTMLButtonElement>(".subject-die")];
  const beginKey = () => document.querySelector<HTMLButtonElement>(".begin-key button");
  const loads = () => subjectList.load.mockResolvedValue({ subjects: TEST_SUBJECTS, notices: "" });

  it("deals the pair of a ticket spent in Kyoto Seika Practice Mode, hides the tools and holds the sheet until Begin", async () => {
    loads();
    await openKyotoSeikaSheet();
    expect(dice()).toHaveLength(2);
    expect(document.querySelector(".drawing-screen")?.classList).toContain("is-dealt");
    expect(sheetCalls.settings?.paused).toBe(true);
    const upper = TEST_SUBJECTS.find((s) =>
      dice()[0].getAttribute("aria-label")?.includes(`: ${s.ja},`),
    );
    act(() => beginKey()?.click());
    await settle(1000);
    expect(sheetCalls.settings?.paused).toBe(false);
    expect(keptRecord()).toMatchObject({ kyotoSeika: { begun: true } });
    expect(sheetCalls.label).toContain(upper?.ja);
  });

  it("brings a reload back to the same balloons, its charred die still charred", async () => {
    loads();
    const part = { subjects: [WIND, REUNION], rolls: [CHARRED_AT_ROLL, 2], begun: false } as const;
    await openKyotoSeikaSheet({
      status: "found",
      ticket: 9,
      elapsedMs: 0,
      nsfw: false,
      kyotoSeika: part,
      steps: [],
    });
    expect(dice()[0].getAttribute("aria-disabled")).toBe("true");
    expect(dice()[1].getAttribute("aria-label")).toContain(REUNION.ja);
  });

  it("shows why the subjects didn't load, and deals once they do", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    subjectList.load.mockRejectedValueOnce(new Error("The chunk didn't load"));
    loads();
    await openKyotoSeikaSheet();
    expect(dice()).toHaveLength(0);
    act(() => buttonSaying(strings.ui.errorLine.tryAgain.en)?.click());
    await settle();
    expect(dice()).toHaveLength(2);
  });

  it("seals a begun sheet with its pair, each subject as the sticker keeps it", async () => {
    sealing.cut.mockResolvedValue({
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
      place: { x: 0, y: 0, w: 10, h: 10 },
      contour: [],
      layers: {},
      maskImage: document.createElement("canvas"),
      dispose: () => {},
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const seal = vi.fn<ApiClient["seal"]>(() => new Promise(() => {}));
    const part = { subjects: [WIND, REUNION], rolls: [0, 0], begun: true } as const;
    // Begun and kept at 0:00, it seals as soon as its clock runs again.
    const atTimeUp = sessionMs(true);
    await openKyotoSeikaSheet(
      { ...keptAtTimeUp, ticket: 9, elapsedMs: atTimeUp, kyotoSeika: part },
      { seal },
    );
    act(() => document.querySelector<HTMLButtonElement>(".timer-stub")?.click());
    await settle(1000);
    const pick = ({ ja, reading, en }: KyotoSeikaSubject) => ({ ja, reading, en });
    expect(seal).toHaveBeenCalledOnce();
    expect(seal.mock.calls[0]?.[0].kyotoSeikaSubjects).toEqual([pick(WIND), pick(REUNION)]);
  });

  it("names Begin by what it does", async () => {
    loads();
    await openKyotoSeikaSheet();
    expect(beginKey()?.getAttribute("aria-label")).toBe(
      strings.kyotoSeika.begin.label.en.replace(
        "{{minutes}}",
        String(KYOTO_SEIKA_TIME_USED_S / 60),
      ),
    );
  });
});
