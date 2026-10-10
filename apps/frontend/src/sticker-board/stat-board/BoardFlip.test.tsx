// @vitest-environment happy-dom
import { act, createRef, lazy, Suspense, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buttonNamed, ReducedMotion, renderInHost, type HostView } from "../../ui/testing";
import { BoardFlip } from "./BoardFlip";

let view: HostView;
const onTurnedChange = vi.fn();
const onBackPressed = vi.fn();

const render = (turned: boolean) =>
  view.rerender(
    <BoardFlip
      turned={turned}
      onTurnedChange={onTurnedChange}
      front={<button>front</button>}
      back={<button onClick={onBackPressed}>back</button>}
    />,
  );

const button = (label: string) => buttonNamed(view.host, label);
const isInert = (label: string) => button(label).closest("[inert]") !== null;

beforeEach(() => {
  // A never-played animation never lands, so every check below happens mid-turn. Reversing one
  // would start happy-dom's playback, whose cancel rejects `finished` unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  vi.spyOn(Animation.prototype, "reverse").mockImplementation(() => {});
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
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

  it("focuses the stat board's control once its code is in, when the board lands before that", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(() => new ReducedMotion(true));
    const flipBack = createRef<HTMLButtonElement>();
    let codeIn = () => {};
    const LateBack = lazy(
      () =>
        new Promise<{ default: () => ReactNode }>((resolve) => {
          codeIn = () => resolve({ default: () => <button ref={flipBack}>Flip back</button> });
        }),
    );
    // As on the Sticker Board: the stat board mounts as the board first turns over.
    const board = (turned: boolean) =>
      view.rerender(
        <BoardFlip
          turned={turned}
          onTurnedChange={onTurnedChange}
          backFocus={flipBack}
          front={<button>front</button>}
          back={
            turned && (
              <Suspense fallback={null}>
                <LateBack />
              </Suspense>
            )
          }
        />,
      );
    board(false);
    // Reduced motion lands the turn at once, before the stat board's code is in.
    board(true);
    await act(async () => codeIn());
    expect(flipBack.current).not.toBeNull();
    expect(document.activeElement).toBe(flipBack.current);
  });

  it("turns back on a tap mid-turn, without pressing what's under it", () => {
    render(false);
    render(true);
    act(() => button("back").click());
    expect(onTurnedChange).toHaveBeenCalledWith(false);
    expect(onBackPressed).not.toHaveBeenCalled();
  });
});
