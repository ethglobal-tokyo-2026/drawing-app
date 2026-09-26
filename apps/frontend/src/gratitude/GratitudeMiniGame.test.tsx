// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import { gratitudeOf } from "../api/mock/gratitude";
import { emptyApi } from "../api/testing";
import { GratitudeMiniGame, type GratitudeResult } from "./GratitudeMiniGame";

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
      </ApiProvider>,
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
  recordGratitude.mockImplementation((body) =>
    Promise.resolve({ gratitude: gratitudeOf(body, 0) }),
  );
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

describe("GratitudeMiniGame", () => {
  it("sends with one tap: the heart flies to the giver and the receipt says so", async () => {
    open();
    tapOnce();
    await play(3000);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ stickerId: "s1", hits: 1 }));
    expect(document.querySelector(".gr-receipt")?.textContent).toContain("Sent to @alice");
    // Without a gift, as in the stat board's demo, nothing is recorded.
    expect(recordGratitude).not.toHaveBeenCalled();
  });

  it("records a gift's one-tap combo as POST /api/gratitude's body", async () => {
    open({ giftId: "g1" });
    tapOnce();
    await play(3000);
    expect(recordGratitude).toHaveBeenCalledTimes(1);
    const [body] = recordGratitude.mock.calls[0] ?? [];
    if (!body) throw new Error("No gratitude recorded");
    // The doc's fields and no others: the record's timings travel in the replay.
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
      endReason: "sent",
      switchedAtHit: null,
      strokes: [],
      shakes: [],
    });
    // One touch, counted: [msSincePrevious, x, y, counted].
    expect(body.replay.hits).toHaveLength(4);
    expect(body.replay.hits[3]).toBe(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("says so when the server refuses the gratitude", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    recordGratitude.mockRejectedValue(new ApiError(409, { error: "gratitude_already_recorded" }));
    open({ giftId: "g1" });
    tapOnce();
    await play(3000);
    expect(document.querySelector(".gr-failure")?.textContent).toContain(
      "gratitude_already_recorded",
    );
  });

  it("closes without a result before any tap", () => {
    open({ giftId: "g1" });
    act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
    expect(recordGratitude).not.toHaveBeenCalled();
  });
});
