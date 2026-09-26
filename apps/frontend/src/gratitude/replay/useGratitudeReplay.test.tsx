// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { ApiProvider } from "../../api/ApiProvider";
import { gratitude } from "../../api/testFixtures";
import { emptyApi } from "../../api/testing";
import { fakeReplayEngine, REPLAYED_TOTAL, replayAnswer } from "./testReplayEngine";
import { LANDED_HOLD_MS, useGratitudeReplay } from "./useGratitudeReplay";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SEEN_AT = "2026-09-27T00:00:00.000Z";
const read = vi.fn<ApiClient["gratitude"]>();
const markSeen = vi.fn<ApiClient["markGratitudeSeen"]>();
let engine: ReturnType<typeof fakeReplayEngine>;
let container: HTMLDivElement;
let root: Root;

/** The least a card needs: a landing target, one control, and a stage while it plays. */
function Card({ giftId, marksSeen }: { giftId: string; marksSeen: boolean }) {
  const dot = useRef<HTMLSpanElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const replay = useGratitudeReplay({
    giftId,
    host,
    landOn: dot,
    marksSeen,
    reduced: false,
    mount: engine.mount,
  });
  const idle = replay.phase === "idle";
  return (
    <div className="card" data-phase={replay.phase}>
      <span ref={dot} className="dot" />
      <button type="button" onClick={idle ? replay.play : replay.stop}>
        {idle ? "Replay" : "Stop"}
      </button>
      {!idle && <div ref={host} className="host" tabIndex={-1} />}
      {replay.failure && (
        <p className="failure">
          {replay.failure.kind === "load" ? replay.failure.error.code : replay.failure.reason}
        </p>
      )}
      {replay.seenFailure && <p className="seen-failure">{replay.seenFailure.code}</p>}
    </div>
  );
}

const show = ({ giftId = "g-2", marksSeen = true } = {}) =>
  act(() =>
    root.render(
      <ApiProvider client={emptyApi({ gratitude: read, markGratitudeSeen: markSeen })}>
        <Card giftId={giftId} marksSeen={marksSeen} />
      </ApiProvider>,
    ),
  );

const find = (selector: string) => {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`No ${selector} in the card`);
  return found;
};
const phase = () => find(".card").dataset.phase;
/** Lets answers and effects settle, `ms` of time on. */
const wait = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const press = async () => {
  act(() => find("button").click());
  await wait();
};
const land = async () => {
  act(() => engine.last().land());
  await wait();
};
const escape = (target: HTMLElement) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
/** Puts `el` where layout would have it on the page. */
const place = (el: Element, rect: DOMRect) =>
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
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

describe("useGratitudeReplay", () => {
  it("loads the replay when played, not before, and mounts it to land on its target", async () => {
    show();
    expect(read).not.toHaveBeenCalled();
    await press();
    expect(read).toHaveBeenCalledExactlyOnceWith("g-2");
    expect(phase()).toBe("playing");
    const { host, options } = engine.last();
    expect(host).toBe(find(".host"));
    expect(options).toMatchObject({
      replay: replayAnswer("g-2").replay,
      gratitude: replayAnswer("g-2").gratitude,
      reduced: false,
    });
    place(find(".dot"), new DOMRect(30, 40, 40, 40));
    place(host, new DOMRect(12, 100, 268, 300));
    expect(options.landAt()).toEqual({ x: 38, y: -40 });
  });

  it("stops its engine once and goes idle; a load stopped mid-flight never mounts", async () => {
    show();
    await press();
    await press();
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");

    let answer = () => {};
    read.mockImplementation(
      (giftId) =>
        new Promise((resolve) => {
          answer = () => resolve(replayAnswer(giftId));
        }),
    );
    await press();
    expect(phase()).toBe("loading");
    await press();
    act(() => answer());
    await wait();
    expect(engine.mount).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");
  });

  it("loads afresh on a quick second press, with one engine at a time", async () => {
    show();
    await press();
    const first = engine.last();
    act(() => find("button").click());
    act(() => find("button").click());
    await wait();
    expect(read).toHaveBeenCalledTimes(2);
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(engine.mounted).toHaveLength(2);
  });

  it("stops on Escape in its card, and that Escape goes no further", async () => {
    const outside = vi.fn();
    container.addEventListener("keydown", outside);
    show();
    await press();
    escape(find(".host"));
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");
    expect(outside).not.toHaveBeenCalled();
    // With nothing playing, Escape belongs to whatever holds the card.
    escape(find("button"));
    expect(outside).toHaveBeenCalledTimes(1);
  });

  it("stops on Escape with focus outside its card, as Safari leaves it after a click", async () => {
    const outside = vi.fn();
    container.addEventListener("keydown", outside);
    show();
    await press();
    escape(container);
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");
    expect(outside).not.toHaveBeenCalled();
  });

  it("stops when its gift changes, or its card goes", async () => {
    show();
    await press();
    show({ giftId: "g-1" });
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");
    await press();
    expect(engine.mounted).toHaveLength(2);
    act(() => root.render(null));
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
  });

  it("holds the landing, then goes idle and lets its engine go", async () => {
    show({ marksSeen: false });
    await press();
    await land();
    expect(phase()).toBe("landed");
    await wait(LANDED_HOLD_MS - 1);
    expect(phase()).toBe("landed");
    expect(engine.last().stop).not.toHaveBeenCalled();
    await wait(1);
    expect(phase()).toBe("idle");
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
  });

  it("marks the gratitude watched once, as it lands, and only where it may", async () => {
    show();
    await press();
    expect(markSeen).not.toHaveBeenCalled();
    await land();
    expect(markSeen).toHaveBeenCalledExactlyOnceWith("g-2");
    await wait(LANDED_HOLD_MS);
    await press();
    await land();
    expect(markSeen).toHaveBeenCalledTimes(1);

    act(() => root.render(null));
    show({ giftId: "g-3", marksSeen: false });
    await press();
    await land();
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it("goes idle with the load's error when it doesn't load, and plays afresh after", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    read.mockRejectedValueOnce(
      new ApiError(404, { error: "gratitude_not_found", detail: "No gratitude for gift g-2" }),
    );
    show();
    await press();
    expect(phase()).toBe("idle");
    expect(find(".failure").textContent).toBe("gratitude_not_found");
    expect(engine.mount).not.toHaveBeenCalled();
    await press();
    expect(phase()).toBe("playing");
    expect(container.querySelector(".failure")).toBeNull();
  });

  it("goes idle with the reason when its frame loop fails, logged, and lets its engine go", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = new Error("the stage's canvas was lost");
    show();
    await press();
    act(() => engine.last().fail(broken));
    await wait();
    expect(phase()).toBe("idle");
    expect(find(".failure").textContent).toBe("the stage's canvas was lost");
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("g-2"), broken);
    expect(engine.last().stop).toHaveBeenCalledTimes(1);
  });

  it("reports a failed mark without holding the replay, and marks on its next landing", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new ApiError(500, { error: "internal_error", detail: "database is locked" });
    markSeen.mockRejectedValueOnce(failure);
    show();
    await press();
    await land();
    expect(find(".seen-failure").textContent).toBe("internal_error");
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("g-2"), failure);
    await wait(LANDED_HOLD_MS);
    expect(phase()).toBe("idle");
    await press();
    await land();
    expect(markSeen).toHaveBeenCalledTimes(2);
  });
});
