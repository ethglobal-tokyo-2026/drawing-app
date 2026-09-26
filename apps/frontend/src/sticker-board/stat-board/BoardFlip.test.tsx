// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardFlip } from "./BoardFlip";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onTurnedChange = vi.fn();
const onBackPressed = vi.fn();

const render = (turned: boolean) =>
  act(() =>
    root.render(
      <BoardFlip
        turned={turned}
        onTurnedChange={onTurnedChange}
        front={<button>front</button>}
        back={<button onClick={onBackPressed}>back</button>}
      />,
    ),
  );

const button = (label: string) => {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`No "${label}" button`);
  return found;
};
const isInert = (label: string) => button(label).closest("[inert]") !== null;

beforeEach(() => {
  // A never-played animation never lands, so every check below happens mid-turn. Reversing one
  // would start happy-dom's playback, whose cancel rejects `finished` unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  vi.spyOn(Animation.prototype, "reverse").mockImplementation(() => {});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  onTurnedChange.mockReset();
  onBackPressed.mockReset();
});

describe("BoardFlip", () => {
  it("makes the face turning away inert as the turn starts, not when it lands", () => {
    render(false);
    expect([isInert("front"), isInert("back")]).toEqual([false, true]);
    render(true);
    expect([isInert("front"), isInert("back")]).toEqual([true, false]);
    render(false);
    expect([isInert("front"), isInert("back")]).toEqual([false, true]);
  });

  it("turns back on a tap mid-turn, without pressing what's under it", () => {
    render(false);
    render(true);
    act(() => button("back").click());
    expect(onTurnedChange).toHaveBeenCalledWith(false);
    expect(onBackPressed).not.toHaveBeenCalled();
  });
});
