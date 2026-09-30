// @vitest-environment happy-dom
import type { Person } from "@drawing-app/api/client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { ApiProvider } from "../api/ApiProvider";
import { gratitude, people, trailEntry } from "../api/testFixtures";
import { emptyApi, TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import { STAGE_EASE_MS } from "../gratitude/replay/ReplayStage";
import {
  fakeReplayEngine,
  REPLAYED_TOTAL,
  replayAnswer,
} from "../gratitude/replay/testReplayEngine";
import { LANDED_HOLD_MS } from "../gratitude/replay/useGratitudeReplay";
import { errorReason } from "../i18n/errorMessage";
import { ReducedMotion } from "../ui/testing";
import { toTrailRows } from "./trailRows";
import { TransferTrail } from "./TransferTrail";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SEEN_AT = "2026-09-27T00:00:00.000Z";
const PLAY_LABEL = "Play the replay of @bob’s 2,946 gratitude";
const read = vi.fn<ApiClient["gratitude"]>();
const markSeen = vi.fn<ApiClient["markGratitudeSeen"]>();
let engine: ReturnType<typeof fakeReplayEngine>;
let animate: MockInstance<Element["animate"]>;
let container: HTMLDivElement;
let root: Root;

/** A gift in the trail with the gratitude it earned, unwatched by its giver unless `seenAt`. */
const given = (giftId: string, giver: Person, receiver: Person, seenAt: string | null = null) =>
  trailEntry({
    giftId,
    giver,
    receiver,
    gratitude: gratitude({ giftId, total: REPLAYED_TOTAL, seenByGiverAt: seenAt }),
  });

/** The trail as you see it: by default, the gift you gave @bob and his gratitude for it. */
const show = (trail = [given("g-2", TEST_OWNER, people.bob)]) =>
  act(() =>
    root.render(
      <ApiProvider client={emptyApi({ gratitude: read, markGratitudeSeen: markSeen })}>
        <TransferTrail
          rows={toTrailRows(trail)}
          viewerId={TEST_OWNER.id}
          artist={toPerson(people.mika)}
          mountReplay={engine.mount}
        />
      </ApiProvider>,
    ),
  );

const find = (selector: string) => {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`No ${selector} in the trail`);
  return found;
};
const pill = () => find(".transfer-trail__row.is-open .transfer-trail__replay");
const stage = () => container.querySelector(".transfer-trail__row.is-open .replay-stage");
const liveLine = () => find(".transfer-trail__row.is-open [aria-live]").textContent;
const note = () => find(".transfer-trail__row.is-open .transfer-trail__replay-note").textContent;

const wait = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const press = async (el: HTMLElement) => {
  act(() => el.click());
  await wait();
};
const land = async () => {
  act(() => engine.last().land());
  await wait();
};
/** Plays the open card's replay to its end: the landing, its hold, and the stage shutting. */
const playThrough = async () => {
  await press(pill());
  await land();
  await wait(LANDED_HOLD_MS + STAGE_EASE_MS);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  // happy-dom's Web Animations run on their own clock; a stand-in records them instead.
  animate = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
  read.mockImplementation((giftId) => Promise.resolve(replayAnswer(giftId)));
  markSeen.mockImplementation((giftId) =>
    Promise.resolve(gratitude({ giftId, total: REPLAYED_TOTAL, seenByGiverAt: SEEN_AT })),
  );
  engine = fakeReplayEngine();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  read.mockReset();
  markSeen.mockReset();
});

describe("TransferTrail's replay", () => {
  it("plays in the open card on Replay, landing in its heart dot, and Replay turns to Stop", async () => {
    show();
    expect(pill().getAttribute("aria-label")).toBe(PLAY_LABEL);
    expect(read).not.toHaveBeenCalled();
    await press(pill());
    expect(read).toHaveBeenCalledExactlyOnceWith("g-2");
    expect(pill().getAttribute("aria-label")).toBe("Stop the replay");
    expect(liveLine()).toBe("Replaying @bob’s 2,946 gratitude");

    const { host, options } = engine.last();
    expect(stage()?.contains(host)).toBe(true);
    const dot = find(".transfer-trail__row.is-open .transfer-trail__heart");
    vi.spyOn(dot, "getBoundingClientRect").mockReturnValue(new DOMRect(30, 40, 40, 40));
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue(new DOMRect(12, 100, 268, 300));
    expect(options.landAt()).toEqual({ x: 38, y: -40 });
  });

  it("stops on Stop, and the stage shuts with the replay still in it", async () => {
    show();
    await press(pill());
    await press(pill());
    expect(pill().getAttribute("aria-label")).toBe(PLAY_LABEL);
    expect(engine.last().stop).not.toHaveBeenCalled();
    await wait(STAGE_EASE_MS);
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(stage()).toBeNull();
  });

  it("stops on Escape from its stage, leaving the detail around it open, and focus on the pill", async () => {
    const detail = vi.fn();
    container.addEventListener("keydown", detail);
    show();
    await press(pill());
    const { host, stop } = engine.last();
    act(() => host.focus());
    act(() => {
      host.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(detail).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(pill());
    await wait(STAGE_EASE_MS);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("lands: the amount pulses, the live line says so, and the stage shuts a beat later", async () => {
    show();
    await press(pill());
    animate.mockClear();
    await land();
    expect(animate.mock.contexts).toContain(find(".transfer-trail__total"));
    expect(liveLine()).toBe("Replay ended");
    await wait(LANDED_HOLD_MS);
    expect(pill().getAttribute("aria-label")).toBe(PLAY_LABEL);
    // The stage shuts with the landed heart and its total in it, not empty.
    expect(engine.last().stop).not.toHaveBeenCalled();
    await wait(STAGE_EASE_MS);
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(stage()).toBeNull();
  });

  it("says whose gratitude replays: yours, when you sent it", async () => {
    show([given("g-4", people.ken, TEST_OWNER)]);
    await press(pill());
    expect(liveLine()).toBe("Replaying your 2,946 gratitude");
  });

  it("stops when another row opens in its place", async () => {
    show([given("g-2", TEST_OWNER, people.bob), given("g-1", people.ken, TEST_OWNER)]);
    act(() => find(".transfer-trail__row--fold button").click());
    await press(pill());
    act(() => find(".transfer-trail__row:not(.is-open) button").click());
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(stage()).toBeNull();
  });

  it("stops when the trail goes, as paging to another sticker remounts it", async () => {
    show();
    await press(pill());
    act(() => root.render(null));
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
  });

  it("says why the replay didn't load, and Try again plays it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = new ApiError(404, {
      error: "gratitude_not_found",
      detail: "No gratitude for gift g-2",
    });
    read.mockRejectedValueOnce(missing);
    show();
    await press(pill());
    expect(pill().getAttribute("aria-label")).toBe(PLAY_LABEL);
    expect(note()).toBe(`Couldn’t load the replay: ${errorReason(missing)} Try again`);
    await wait(STAGE_EASE_MS);
    expect(stage()).toBeNull();
    const retry = find(".transfer-trail__replay-note button");
    act(() => retry.focus());
    await press(retry);
    expect(engine.mount).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".transfer-trail__replay-note")).toBeNull();
    // Try again goes as it plays, so focus moves to the pill rather than out of the detail.
    expect(document.activeElement).toBe(pill());
  });

  it("says the replay stopped when its frame loop fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    show();
    await press(pill());
    act(() => engine.last().fail(new Error("the stage's canvas was lost")));
    await wait();
    expect(note()).toBe("The replay stopped: the stage's canvas was lost");
    expect(pill().getAttribute("aria-label")).toBe(PLAY_LABEL);
  });

  it("says so in the fine print when its giver's watching couldn't be marked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new ApiError(500, { error: "internal_error", detail: "database is locked" });
    markSeen.mockRejectedValueOnce(failure);
    show();
    await playThrough();
    expect(note()).toBe(`Couldn’t mark this gratitude watched: ${errorReason(failure)}`);
  });

  it("follows reduced motion: told to the engine, switched live, with no pulse or ease", async () => {
    const setting = new ReducedMotion(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(setting);
    show();
    await press(pill());
    const playing = engine.last();
    expect(playing.options.reduced).toBe(true);
    act(() => setting.change(false));
    expect(playing.setReduced).toHaveBeenLastCalledWith(false);
    act(() => setting.change(true));
    expect(playing.setReduced).toHaveBeenLastCalledWith(true);
    await land();
    await wait(LANDED_HOLD_MS);
    await wait();
    expect(stage()).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it("marks the gratitude watched when its giver's replay lands, and no one else's", async () => {
    show();
    await playThrough();
    expect(markSeen).toHaveBeenCalledExactlyOnceWith("g-2");

    act(() => root.render(null));
    show([given("g-3", TEST_OWNER, people.bob, SEEN_AT)]);
    await playThrough();
    act(() => root.render(null));
    show([given("g-4", people.ken, TEST_OWNER)]);
    await playThrough();
    expect(markSeen).toHaveBeenCalledTimes(1);
  });
});
