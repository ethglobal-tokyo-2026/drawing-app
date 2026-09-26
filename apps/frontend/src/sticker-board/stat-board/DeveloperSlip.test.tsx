// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeveloperSlip } from "./DeveloperSlip";
import { RestingSide, type BoardSide } from "./restingSide";
import { PULL_THRESHOLD } from "./usePullToReveal";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

const render = (side: BoardSide = "back") =>
  act(() =>
    root.render(
      <RestingSide value={side}>
        <div className="stat-board__cork">
          <DeveloperSlip>
            <button type="button">Record performance</button>
          </DeveloperSlip>
        </div>
      </RestingSide>,
    ),
  );

const cork = () => host.querySelector<HTMLElement>(".stat-board__cork");
const isOut = () => host.querySelector(".dev-slip")?.hasAttribute("inert") === false;

/** A finger pulling up from the cork's end by `travel` px, then letting go. */
function pull(travel: number) {
  const target = cork();
  if (!target) throw new Error("No cork");
  const touch = (type: string, y: number) =>
    target.dispatchEvent(
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === "touchend" ? [] : [new Touch({ identifier: 1, target, clientY: y })],
      }),
    );
  act(() => {
    touch("touchstart", 600);
    for (let y = 600; y >= 600 - travel; y -= 10) touch("touchmove", y);
    touch("touchend", 600 - travel);
  });
}

beforeEach(() => {
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("DeveloperSlip", () => {
  it("lies collapsed under the cork's end, out of reach", () => {
    render();
    expect(isOut()).toBe(false);
    expect(host.querySelector(".dev-slip [inert], .dev-slip[inert]")).not.toBeNull();
  });

  it("comes out after a pull past the threshold, and not after a short one", () => {
    render();
    pull(PULL_THRESHOLD / 2);
    expect(isOut()).toBe(false);
    pull(PULL_THRESHOLD + 20);
    expect(isOut()).toBe(true);
  });

  it("comes out from its hidden button, with focus on the slip", () => {
    render();
    const open = host.querySelector<HTMLButtonElement>(".dev-slip__open");
    act(() => open?.click());
    expect(isOut()).toBe(true);
    expect(document.activeElement?.classList.contains("stat-board__slip")).toBe(true);
    expect(host.querySelector(".dev-slip__open")).toBeNull();
  });

  it("goes back under once the board rests on its front", () => {
    render();
    pull(PULL_THRESHOLD + 20);
    expect(isOut()).toBe(true);
    render("front");
    expect(isOut()).toBe(false);
  });
});
