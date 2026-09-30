// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import { MeHolder } from "../api/MeHolder";
import { gratitudeOf } from "../api/testing";
import { emptyApi, TEST_ME } from "../api/testing";
import { i18next } from "../i18n/i18n";
import { GratitudeMiniGame, type GratitudeResult } from "./GratitudeMiniGame";
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
const onEnd = vi.fn<(result: GratitudeResult) => void>();
const onClose = vi.fn();
const recordGratitude = vi.fn<ApiClient["recordGratitude"]>();

let host: HTMLDivElement;
let root: Root;
const open = (props: Partial<ComponentProps<typeof GratitudeMiniGame>> = {}) =>
  act(() =>
    root.render(
      <MeHolder me={TEST_ME}>
        <ApiProvider client={emptyApi({ recordGratitude })}>
          <GratitudeMiniGame
            sticker={sticker}
            giver={giver}
            intensity={0.7}
            showFrameTimes={false}
            onEnd={onEnd}
            onClose={onClose}
            {...props}
          />
        </ApiProvider>
      </MeHolder>,
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
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  onEnd.mockReset();
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
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ stickerId: "s1", hits: 1 }));
    const receipt = document.querySelector(".gr-receipt")?.textContent;
    expect(receipt).toContain("gratitude to @alice");
    expect(receipt).toMatch(/\b1 hit(?!s)/);
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
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("says so in plain words when the server refuses the gratitude, and logs why", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    recordGratitude.mockRejectedValue(new ApiError(409, { error: "gratitude_already_recorded" }));
    open({ giftId: "g1" });
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const failure = document.querySelector(".gr-failure")?.textContent;
    expect(failure).toBe("Your gratitude didn't reach @alice. Close this and send it again.");
    expect(logged).toHaveBeenCalled();
  });

  it("says the gratitude sent as the heart reaches the giver", async () => {
    open();
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const total = onEnd.mock.calls[0]?.[0].total ?? 0;
    expect(total).toBeGreaterThan(0);
    expect(document.querySelector(".gr-sr")?.textContent).toBe(
      `Sent ${total.toLocaleString("en-US")} gratitude to @alice.`,
    );
  });

  it("opens with focus on the heart, and gives it to the receipt once the heart has gone", async () => {
    open();
    expect(document.activeElement).toBe(heart());
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    expect(heart().disabled).toBe(true);
    expect(document.activeElement?.textContent).toContain("Back to your board");
    expect(document.activeElement?.closest(".gr-receipt")).not.toBeNull();
  });

  it("gives a caught combo's length in hits on the receipt, not its seconds or method", async () => {
    open();
    tapOnce();
    await play(100);
    tapOnce();
    await play(100);
    tapOnce();
    await play(8000);
    const { hits } = onEnd.mock.calls[0]?.[0] ?? { hits: 0 };
    expect(hits).toBe(3);
    const sub = document.querySelector(".gr-rc-sub")?.textContent ?? "";
    expect(sub).toContain("3 hits");
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
    expect(onEnd).not.toHaveBeenCalled();
    expect(recordGratitude).not.toHaveBeenCalled();
  });
});

describe("GratitudeMiniGame in Japanese", () => {
  afterEach(() => i18next.changeLanguage("en"));

  it("names the combo's peak tier on the receipt with no gloss", async () => {
    await i18next.changeLanguage("ja");
    open();
    tapOnce();
    await play(ONE_TAP_ENDS_MS);
    const peakTier = onEnd.mock.calls[0]?.[0].peakTier ?? 0;
    const sub = document.querySelector(".gr-rc-sub")?.textContent ?? "";
    expect(sub.split("\n").at(-1)).toBe(TIER_NAMES[peakTier].jp);
  });
});
