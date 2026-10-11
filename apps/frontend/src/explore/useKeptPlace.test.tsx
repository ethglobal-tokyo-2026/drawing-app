// @vitest-environment happy-dom
import { act, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInHost } from "../ui/testing";
import { useKeptPlace } from "./useKeptPlace";

interface Options {
  columns: 1 | 2;
  visible: boolean;
  resetKey: string;
}

let view: ReturnType<typeof renderInHost> | undefined;

function Pile({ columns, visible, resetKey }: Options) {
  const explore = useRef<HTMLDivElement>(null);
  const { keepPlace } = useKeptPlace(explore, columns, { visible, resetKey });
  return (
    <div ref={explore} className="explore" data-columns={columns}>
      <button type="button" className="save-place" onClick={keepPlace}>
        Save place
      </button>
      <div className="explore-view" hidden={!visible}>
        <div className="pile-sticker" data-pile-id="first" />
        <div className="pile-sticker" data-pile-id="second" />
      </div>
    </div>
  );
}

function geometry() {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(700);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const root = this.closest<HTMLElement>(".explore");
    const scroller = this.matches(".pile-sticker")
      ? root?.querySelector<HTMLElement>(".explore-view")?.hidden
        ? null
        : root?.querySelector<HTMLElement>(".explore-view")
      : null;
    const top = this.matches(".pile-sticker")
      ? (this.dataset.pileId === "first" ? 100 : 300) -
        (root?.dataset.columns === "2" ? (scroller?.scrollTop ?? 0) : (root?.scrollTop ?? 0))
      : 0;
    return new DOMRect(0, top, 0, 150);
  });
}

function savePlace() {
  const button = view?.host.querySelector<HTMLButtonElement>(".save-place");
  if (!button) throw new Error("save place button missing");
  act(() => button.click());
}

beforeEach(() => {
  vi.useFakeTimers();
  geometry();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useKeptPlace", () => {
  it("saves an immediate scroll and ignores hidden search scrolling before restoring the pile", async () => {
    view = renderInHost(<Pile columns={1} visible resetKey="explore-false" />);
    const root = view.host.querySelector<HTMLElement>(".explore");
    if (!root) throw new Error("Explore scroller missing");
    root.scrollTop = 350;
    act(() => {
      root.dispatchEvent(new Event("scroll"));
    });
    savePlace();
    root.scrollTop = 20;
    view.rerender(<Pile columns={1} visible={false} resetKey="explore-false" />);
    act(() => {
      root.dispatchEvent(new Event("scroll"));
    });
    await wait(120);

    view.rerender(<Pile columns={1} visible resetKey="explore-false" />);
    expect(root.scrollTop).toBe(350);
  });

  it("restores on the new scroller after rotation while the pile is hidden", () => {
    view = renderInHost(<Pile columns={1} visible resetKey="explore-false" />);
    const root = view.host.querySelector<HTMLElement>(".explore");
    const column = view.host.querySelector<HTMLElement>(".explore-view");
    if (!root || !column) throw new Error("Explore scroller missing");
    root.scrollTop = 350;
    savePlace();
    view.rerender(<Pile columns={1} visible={false} resetKey="explore-false" />);
    view.rerender(<Pile columns={2} visible={false} resetKey="explore-false" />);
    view.rerender(<Pile columns={2} visible resetKey="explore-false" />);
    expect(column.scrollTop).toBe(350);
  });

  it("drops the old marker when the Explore query key changes while hidden", () => {
    view = renderInHost(<Pile columns={1} visible resetKey="explore-false" />);
    const root = view.host.querySelector<HTMLElement>(".explore");
    if (!root) throw new Error("Explore scroller missing");
    root.scrollTop = 350;
    savePlace();
    view.rerender(<Pile columns={1} visible={false} resetKey="explore-false" />);
    root.scrollTop = 0;
    view.rerender(<Pile columns={1} visible={false} resetKey="explore-true" />);
    view.rerender(<Pile columns={1} visible resetKey="explore-true" />);
    expect(root.scrollTop).toBe(0);
  });
});
