// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInHost, type HostView } from "../../ui/testing";
import { DeveloperSlip } from "./DeveloperSlip";
import { RestingSide, type BoardSide } from "./restingSide";
import { PULL_THRESHOLD } from "./usePullToReveal";

let view: HostView;

const render = (side: BoardSide = "back") =>
  view.rerender(
    <RestingSide value={side}>
      <div className="stat-board__cork">
        <DeveloperSlip>
          <button type="button">Record performance</button>
        </DeveloperSlip>
      </div>
    </RestingSide>,
  );

const cork = () => view.host.querySelector<HTMLElement>(".stat-board__cork");
const isOut = () => view.host.querySelector(".dev-slip")?.hasAttribute("inert") === false;

/** Fingers on the cork, one at each y given: none once the last has lifted. */
function touch(type: string, ...ys: number[]) {
  const target = cork();
  if (!target) throw new Error("No cork");
  target.dispatchEvent(
    new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: ys.map((clientY, i) => new Touch({ identifier: i + 1, target, clientY })),
    }),
  );
}

/** A finger pulling up from the cork's end by `travel` px, still down. */
function pullUp(travel: number) {
  touch("touchstart", 600);
  for (let y = 600; y >= 600 - travel; y -= 10) touch("touchmove", y);
}

/** A finger pulling up from the cork's end by `travel` px, then letting go. */
const pull = (travel: number) =>
  act(() => {
    pullUp(travel);
    touch("touchend");
  });

beforeEach(() => {
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
});

describe("DeveloperSlip", () => {
  it("lies collapsed under the cork's end, out of reach", () => {
    render();
    expect(isOut()).toBe(false);
    expect(view.host.querySelector(".dev-slip [inert], .dev-slip[inert]")).not.toBeNull();
  });

  it("comes out after a pull past the threshold, and not after a short one", () => {
    render();
    pull(PULL_THRESHOLD / 2);
    expect(isOut()).toBe(false);
    pull(PULL_THRESHOLD + 20);
    expect(isOut()).toBe(true);
  });

  it("goes back under when a second finger lands mid-pull", () => {
    render();
    const shown = () =>
      view.host.querySelector<HTMLElement>(".dev-slip")?.style.getPropertyValue("--pull");
    act(() => {
      pullUp(PULL_THRESHOLD / 2);
      touch("touchstart", 600 - PULL_THRESHOLD / 2, 600);
    });
    expect(shown()).toBe("0px");
    act(() => {
      touch("touchend", 600);
      touch("touchend");
    });
    expect(shown()).toBe("0px");
    expect(isOut()).toBe(false);
  });

  it("comes out from its hidden button, with focus on the slip", () => {
    render();
    const open = view.host.querySelector<HTMLButtonElement>(".dev-slip__open");
    act(() => open?.click());
    expect(isOut()).toBe(true);
    expect(document.activeElement?.classList.contains("stat-board__slip")).toBe(true);
    expect(view.host.querySelector(".dev-slip__open")).toBeNull();
  });

  it("goes back under once the board rests on its front", () => {
    render();
    pull(PULL_THRESHOLD + 20);
    expect(isOut()).toBe(true);
    render("front");
    expect(isOut()).toBe(false);
  });
});
