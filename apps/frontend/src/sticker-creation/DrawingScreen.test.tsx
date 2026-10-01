// @vitest-environment happy-dom
import type { Tickets } from "@drawing-app/api/client";
import { act, forwardRef, useEffect, useImperativeHandle } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import { strings } from "../i18n/strings";
import { useTickets } from "../tickets/useTickets";
import { DrawingScreen } from "./DrawingScreen";
import { LOAD_TIMEOUT_MS, type KeptSession } from "./session/keptSession";
import { keepSentSeal, sealWentOut } from "./session/sentSeal";
import { SESSION_MS } from "./session/session";

const kept = vi.hoisted(() => ({
  session: { status: "none" } as unknown,
}));

vi.mock("./canvas/DrawingCanvas", () => ({
  DrawingCanvas: forwardRef(function Sheet(_props, ref) {
    useImperativeHandle(ref, () => ({
      undo() {},
      redo() {},
      reset() {},
      load() {},
      ops: () => [],
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
// The phone can't cut this sticker, however often it tries.
vi.mock("./sealing/makeSticker", () => ({
  makeSticker: () => Promise.reject(new Error("The sealing worker stopped")),
}));
vi.mock("./TimerDot", () => ({
  TimerDot: ({ onToggle }: { onToggle: () => void }) => (
    <button type="button" className="timer-stub" onClick={onToggle} />
  ),
}));
vi.mock("../identity/useMyAgeStatus", () => ({ useMyAgeStatus: () => "unknown" }));
vi.mock("../identity/privy", () => ({ retryPrivySignIn: () => {} }));
vi.mock("../tickets/ReserveTicketCheckout", () => ({ ReserveTicketCheckout: () => null }));
vi.mock("./tools/ColorSheet", () => ({ ColorSheet: () => null }));
vi.mock("./tools/SizeRail", () => ({ SizeRail: () => null }));
vi.mock("./tools/SmoothingBar", () => ({ SmoothingBar: () => null }));
vi.mock("./tools/ToolStrip", () => ({ ToolStrip: () => null }));

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
  vi.useRealTimers();
});

/** Lets the drawing screen's loads, frames and effects run. */
const settle = async (ms = 0) => {
  for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(ms / 5));
};

/** Opens the drawing screen after a reload that kept `session`, with these tickets from the server. */
function reopen(session: KeptSession, tickets: Partial<Tickets> = {}) {
  vi.useFakeTimers();
  kept.session = session;
  view = renderWithApi(
    <>
      <DrawingScreen active onSealed={() => {}} onNewSticker={() => {}} onGoToBoard={() => {}} />
      <SheetProbe />
    </>,
    emptyApi({ tickets: () => Promise.resolve({ ...FRESH_TICKETS, ...tickets }) }),
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
  elapsedMs: SESSION_MS,
  nsfw: false,
  ops: [],
};
const chip = () => document.querySelector(".seal-chip")?.textContent ?? "";

describe("the drawing screen after a reload", () => {
  it("stops waiting on a sticker in progress whose seal went out once a read that never answers has had a second wait", async () => {
    keepSentSeal(TEST_ME.id, 7);
    reopen(
      { status: "unread", ticket: 7, error: new Error("slow"), later: new Promise(() => {}) },
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
