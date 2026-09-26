// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GratitudeMiniGame, type GratitudeResult } from "./GratitudeMiniGame";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

let host: HTMLDivElement;
let root: Root;
const heart = () => {
  const el = document.querySelector<HTMLButtonElement>(".gr-heart-btn");
  if (!el) throw new Error("No heart on screen");
  return el;
};
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
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <GratitudeMiniGame
        sticker={sticker}
        giver={giver}
        intensity={0.7}
        showFrameTimes={false}
        onEnd={onEnd}
        onClose={onClose}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  onEnd.mockReset();
  onClose.mockReset();
});

describe("GratitudeMiniGame", () => {
  it("sends with one tap: the heart flies to the giver and the receipt says so", async () => {
    act(() => {
      heart().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await play(3000);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ stickerId: "s1", hits: 1 }));
    expect(document.querySelector(".gr-receipt")?.textContent).toContain("Sent to @alice");
  });

  it("closes without a result before any tap", () => {
    act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
