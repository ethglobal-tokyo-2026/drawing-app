// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Gratitude } from "@drawing-app/api/client";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import { MeContext } from "../api/meContext";
import { emptyApi, gratitudeOf, recordGratitudeBody, TEST_ME } from "../api/testing";
import { errorDetail } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { refusingStorage } from "../ui/testing";
import { GratitudeMiniGame } from "./GratitudeMiniGame";
import { isGratitudeWaiting, resendPendingGratitude } from "./gratitudeOutbox";
import { TIER_NAMES } from "./tierNames";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const sticker = {
  id: "s1",
  no: 147,
  timeUsed: 292,
  createdAt: Date.UTC(2026, 8, 23),
  urls: { png: "blob:sticker" },
  width: 400,
  height: 400,
};
const giver = { handle: "alice", displayName: "Alice Sato" };
const onClose = vi.fn();
const recordGratitude = vi.fn<ApiClient["recordGratitude"]>();

let host: HTMLDivElement;
let root: Root;
const open = (props: Partial<ComponentProps<typeof GratitudeMiniGame>> = {}) =>
  act(() =>
    root.render(
      <MeContext value={TEST_ME}>
        <ApiProvider client={emptyApi({ recordGratitude })}>
          <GratitudeMiniGame
            sticker={sticker}
            giver={giver}
            intensity={0.7}
            showFrameTimes={false}
            onClose={onClose}
            {...props}
          />
        </ApiProvider>
      </MeContext>,
    ),
  );
const heart = () => {
  const el = document.querySelector<HTMLButtonElement>(".gr-heart-btn");
  if (!el) throw new Error("No heart on screen");
  return el;
};
const tapOnce = () =>
  act(() => {
    heart().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
const play = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const live = () => document.querySelector(".gr-sr")?.textContent;
const receiptText = (selector: string) =>
  document.querySelector(`.gr-receipt ${selector}`)?.textContent ?? "";
const receiptLabel = () => document.querySelector(".gr-receipt")?.getAttribute("aria-label");
const closeButton = () => {
  const el = document.querySelector<HTMLButtonElement>(".gr-close");
  if (!el) throw new Error("No X on screen");
  return el;
};
/** Taps `times` times, `gapMs` apart. */
const tapFor = async (times: number, gapMs = 150) => {
  for (let i = 0; i < times; i++) {
    tapOnce();
    await play(gapMs);
  }
};
/** The page goes, as a webview torn down does: the screen with it, and a combo in play never ends. */
const pageGoes = () => {
  act(() => root.unmount());
  root = createRoot(host);
};
/** The next app open, as you: what it sends, once a combo kept in play may go. */
async function nextOpenSends() {
  const next = vi.fn<ApiClient["recordGratitude"]>((body) => Promise.resolve(gratitudeOf(body)));
  const resent = resendPendingGratitude({ recordGratitude: next }, TEST_ME.id);
  await vi.runAllTimersAsync();
  await resent;
  return next.mock.calls.map(([body]) => body);
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
  // happy-dom runs no Web Animations; a stand-in keeps the effects' calls harmless.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
  recordGratitude.mockImplementation((body) => Promise.resolve(gratitudeOf(body)));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  onClose.mockReset();
  recordGratitude.mockReset();
});

/** Long enough for one tap's bar to run out and its ending to play. */
const ONE_TAP_ENDS_MS = 8000;

describe("GratitudeMiniGame", () => {
  it("sends one tap's gratitude once its bar runs out, and the receipt says so", async () => {
    open();
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(receiptText(".gr-rc-head")).toBe("gratitude to @alice");
    expect(receiptText(".hit-counter")).toContain("1 hit");
    expect(receiptText(".hit-counter")).not.toContain("1 hits");
    // Without a gift, as in the stat board's demo, nothing is recorded.
    expect(recordGratitude).not.toHaveBeenCalled();
  });

  it("records a gift's one-tap combo as POST /api/gratitude's body", async () => {
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(recordGratitude).toHaveBeenCalledTimes(1);
    const [body] = recordGratitude.mock.calls[0] ?? [];
    if (!body) throw new Error("No gratitude recorded");
    // RecordGratitude's fields and no others: the record's timings travel in the replay.
    expect(Object.keys(body).sort()).toEqual([
      "gameConfigVersion",
      "giftId",
      "hits",
      "idempotencyKey",
      "method",
      "peakMult",
      "peakTier",
      "replay",
      "total",
    ]);
    expect(body).toMatchObject({ giftId: "g1", method: "tap", hits: 1, peakTier: 0 });
    expect(body.idempotencyKey).toMatch(UUID_V4);
    expect(Object.keys(body.replay).sort()).toEqual([
      "durationMs",
      "endReason",
      "hits",
      "intensity",
      "seed",
      "shakes",
      "stage",
      "strokes",
      "switchedAtHit",
      "v",
    ]);
    expect(body.replay).toMatchObject({
      v: 1,
      intensity: 0.7,
      endReason: "empty",
      switchedAtHit: null,
      strokes: [],
      shakes: [],
    });
    // One touch, counted: [msSincePrevious, x, y, counted].
    expect(body.replay.hits).toHaveLength(4);
    expect(body.replay.hits[3]).toBe(1);
  });

  it("keeps a combo on the device as it plays, so a page torn down mid-combo still sends it", async () => {
    open({ giftId: "g1" });
    await tapFor(10);
    pageGoes();
    expect(recordGratitude).not.toHaveBeenCalled();
    const [sent, ...more] = await nextOpenSends();
    expect(more).toEqual([]);
    expect(sent).toMatchObject({ giftId: "g1", method: "tap", replay: { endReason: "hidden" } });
    // Kept as it grew, not only at its first hit.
    expect(sent?.hits).toBeGreaterThan(1);
  });

  it("sends a finished combo once, in place of what was kept of it in play", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    recordGratitude.mockRejectedValue(new TypeError("Failed to fetch"));
    open({ giftId: "g1" });
    await tapFor(5);
    await play(ONE_TAP_ENDS_MS);
    const [finished] = recordGratitude.mock.calls[0] ?? [];
    pageGoes();
    expect(await nextOpenSends()).toEqual([finished]);
  });

  it("says the gratitude sent once the receipt is up and the server has it", async () => {
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const total = receiptText(".gr-rc-figure");
    expect(total).toMatch(/^[\d,]+$/);
    expect(live()).toBe(`Sent ${total} gratitude to @alice.`);
    expect(receiptLabel()).toBe("Gratitude sent");
    expect(document.querySelector(".gr-rc-note")).toBeNull();
  });

  it("says the gratitude is saved on the phone, not sent, when the server can't be reached", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    recordGratitude.mockRejectedValue(new TypeError("Failed to fetch"));
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const kept = "Saved on this phone. It goes to @alice when you’re back online.";
    expect(receiptText(".gr-rc-note")).toBe(kept);
    expect(receiptLabel()).toBe("Gratitude saved");
    expect(live()).toBe(kept);
    expect(live()).not.toMatch(/^Sent/);
  });

  it("says the gratitude was neither sent nor saved when the server can't be reached and the phone can't keep it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    recordGratitude.mockRejectedValue(new TypeError("Failed to fetch"));
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const note = receiptText(".gr-rc-note p");
    expect(note).toContain("wasn’t sent");
    expect(note).toContain("couldn’t save it");
    expect(note).not.toContain("Saved on this phone");
    expect(receiptLabel()).toBe("Gratitude not sent or saved");
    expect(live()).toBe(note);
    // Nothing waits in the outbox, so the sticker detail offers Send gratitude again.
    expect(isGratitudeWaiting(TEST_ME.id, "g1")).toBe(false);
  });

  it("updates the receipt of a saved combo once it's sent while the screen is still up", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    recordGratitude.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(receiptText(".gr-rc-note")).toContain("Saved on this phone");
    // The phone is back online, and the app sends what it kept.
    await act(() => resendPendingGratitude({ recordGratitude }, TEST_ME.id));
    expect(document.querySelector(".gr-rc-note")).toBeNull();
    expect(receiptLabel()).toBe("Gratitude sent");
    expect(live()).toMatch(/^Sent /);
  });

  it("says a send still going out is going out, then what became of it", async () => {
    let answer: (gratitude: Gratitude) => void = () => {};
    recordGratitude.mockImplementation(
      (body) =>
        new Promise((resolve) => {
          answer = () => resolve(gratitudeOf(body));
        }),
    );
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(receiptText(".gr-rc-note")).toBe("Sending…");
    expect(receiptLabel()).toBe("Sending gratitude");
    expect(live()).not.toMatch(/^Sent/);
    answer(gratitudeOf(recordGratitudeBody()));
    await play(0);
    expect(document.querySelector(".gr-rc-note")).toBeNull();
    expect(live()).toMatch(/^Sent /);
  });

  it.each([
    [409, "gratitude_already_recorded", /already with @alice/, false],
    [403, "not_receiver", /received by someone else/, false],
    [404, "gift_not_found", /isn’t here anymore/, false],
    [409, "gift_not_received", /isn’t marked received yet/, true],
    [400, "replay_invalid", /couldn’t read your combo/, true],
    [403, "something_new", /didn’t accept your gratitude for @alice/, false],
  ])(
    "says why the server refused the gratitude (%i %s), and offers sending again only where it can work",
    async (status, code, reason, offersAgain) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      recordGratitude.mockRejectedValue(new ApiError(status, { error: code }));
      open({ giftId: "g1" });
      tapOnce();
      await play(ONE_TAP_ENDS_MS);
      const note = receiptText(".gr-rc-note p");
      expect(note).toMatch(reason);
      expect(note).toContain("wasn’t sent");
      expect(/(send|try) (it |your gratitude )?again/i.test(note)).toBe(offersAgain);
      expect(receiptLabel()).toBe("Gratitude not sent");
      expect(live()).toBe(note);
    },
  );

  it("keeps an unforeseen refusal's code out of its sentence, as details for a report, and leaves focus on the key", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = new ApiError(403, { error: "something_new", detail: "the combo broke a rule" });
    recordGratitude.mockRejectedValue(refusal);
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const sentence = receiptText(".gr-rc-note p");
    expect(sentence).toContain("wasn’t sent");
    expect(sentence).not.toContain(refusal.code);
    expect(receiptText(".gr-rc-note .error-detail")).toContain(errorDetail(refusal));
    expect(live()).toBe(sentence);
    // Copy sits in the note above the key, but the key is what takes focus.
    expect(document.activeElement?.textContent).toContain("Back to My board");
  });

  it("ends a combo in play at the X and shows its receipt, rather than closing on a send nobody saw", async () => {
    open({ giftId: "g1" });
    expect(closeButton().getAttribute("aria-label")).toBe("Close");
    await tapFor(3, 100);
    expect(closeButton().getAttribute("aria-label")).toBe("End and send gratitude");
    act(() => closeButton().click());
    expect(onClose).not.toHaveBeenCalled();
    expect(recordGratitude).toHaveBeenCalledTimes(1);
    expect(recordGratitude.mock.calls[0]?.[0]).toMatchObject({
      hits: 3,
      replay: { endReason: "closed" },
    });
    await play(ONE_TAP_ENDS_MS);
    expect(receiptText(".gr-rc-figure")).toMatch(/^[\d,]+$/);
    expect(closeButton().getAttribute("aria-label")).toBe("Close");
    // Now the X closes the screen.
    act(() => closeButton().click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens with focus on the heart, and gives it to the receipt once the heart has gone", async () => {
    open();
    expect(document.activeElement).toBe(heart());
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(heart().disabled).toBe(true);
    expect(document.activeElement?.textContent).toContain("Back to My board");
    expect(document.activeElement?.closest(".gr-receipt")).not.toBeNull();
  });

  it("gives a combo's length on the receipt as the hit counter, never with a ×, not its seconds or method", async () => {
    open();
    tapOnce();
    await play(100);
    tapOnce();
    await play(100);
    tapOnce();
    await play(8000);
    const counter = document.querySelector(".gr-receipt .hit-counter");
    expect(counter?.textContent).toContain("3 hits");
    expect(counter?.textContent).not.toContain("×");
    const sub = document.querySelector(".gr-rc-sub")?.textContent ?? "";
    expect(sub).not.toMatch(/\d\.\ds|\btap\b/);
  });

  it("is modal: the rest of the phone goes inert and unseen while it's open, and comes back as it was", () => {
    const phone = document.createElement("div");
    phone.className = "phone";
    const board = phone.appendChild(document.createElement("div"));
    const tabs = phone.appendChild(document.createElement("nav"));
    tabs.setAttribute("inert", "");
    const seen = () => [board.style.visibility, tabs.style.visibility];
    document.body.append(phone);
    try {
      open();
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute("aria-modal")).toBe("true");
      expect(dialog?.parentElement).toBe(phone);
      expect(board.hasAttribute("inert")).toBe(true);
      expect(seen()).toEqual(["hidden", "hidden"]);
      act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
      expect(board.hasAttribute("inert")).toBe(false);
      expect(tabs.hasAttribute("inert")).toBe(true);
      expect(seen()).toEqual(["", ""]);

      // A fresh screen, unmounted without its X.
      act(() => root.render(null));
      open();
      expect(board.hasAttribute("inert")).toBe(true);
      expect(seen()).toEqual(["hidden", "hidden"]);
      act(() => root.render(null));
      expect(board.hasAttribute("inert")).toBe(false);
      expect(tabs.hasAttribute("inert")).toBe(true);
      expect(seen()).toEqual(["", ""]);
    } finally {
      phone.remove();
    }
  });

  it("closes without a result before any tap", () => {
    open({ giftId: "g1" });
    act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(recordGratitude).not.toHaveBeenCalled();
  });
});

describe("GratitudeMiniGame in Japanese", () => {
  afterEach(() => i18next.changeLanguage("en"));

  it("names the combo's peak tier on the receipt with no gloss", async () => {
    await i18next.changeLanguage("ja");
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const peakTier = recordGratitude.mock.calls[0]?.[0].peakTier ?? 0;
    expect(receiptText(".gr-rc-sub > p")).toBe(TIER_NAMES[peakTier].jp);
  });
});
